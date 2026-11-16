import { describe, expect, it } from "vitest";

import { referralProgramKey } from "../src/kind.ts";
import {
  clearQueue,
  need,
  registerStaff,
  sign,
  staff,
  start,
  stateOf,
} from "./support/batch-flow.ts";
import { addressOf, batches, sim, waitingPayout } from "./support/batches.ts";
import {
  chain,
  clock,
  feeAsset,
  referrals,
  registerDatabase,
} from "./support/fixture.ts";

registerDatabase();
registerStaff();

describe("paying referrers in a batch", () => {
  it("builds one transaction that pays every payout waiting, to its own address, and changes nothing in the ledger until it is signed", async () => {
    await clearQueue();
    const a = await waitingPayout(10_000n, addressOf("0a0b0c"));
    const b = await waitingPayout(20_000n, addressOf("0d0e0f"));
    const { batch, resumed, skipped } = await need(start());
    expect(resumed).toBe(false);
    expect(skipped).toEqual([]);
    expect(batch.state).toBe("awaiting_signature");
    expect([...batch.payoutIds].sort()).toEqual(
      [a.payout.id, b.payout.id].sort(),
    );
    expect(batch.unsigned.summary.operation).toBe("pay-batch");
    expect(
      batch.unsigned.summary.payments?.map(({ amount }) => amount.baseUnits),
    ).toEqual([300n, 600n]);
    expect(await stateOf(a.payout.id)).toBe("requested");
    expect(await stateOf(b.payout.id)).toBe("requested");
  });

  it("asking again for a batch in progress returns it, however the payouts waiting have changed", async () => {
    await clearQueue();
    await waitingPayout(10_000n, addressOf("0a0b0c"));
    const first = await need(start());
    await waitingPayout(10_000n, addressOf("0d0e0f"));
    const again = await need(start());
    expect(again.resumed).toBe(true);
    expect(again.batch.id).toBe(first.batch.id);
    expect(again.batch.payoutIds).toHaveLength(1);
  });

  it("is signed, sent once, and the payouts are handed over; then it confirms, completes, and every payout is paid with the transaction's id", async () => {
    await clearQueue();
    const a = await waitingPayout(10_000n, addressOf("0a0b0c"));
    const { batch } = await need(start());
    const submitted = await batches.submit({
      batchId: batch.id,
      signed: sign(batch),
      staffId: staff.id,
    });
    expect(submitted).toMatchObject({
      ok: true,
      record: { state: "broadcast_accepted", submittedBy: staff.id },
    });
    expect(await stateOf(a.payout.id)).toBe("in_progress");
    // The same signed bytes again change nothing.
    expect(
      await batches.submit({
        batchId: batch.id,
        signed: sign(batch),
        staffId: staff.id,
      }),
    ).toMatchObject({ ok: true });
    sim.controls.advance(chain, 1);
    expect(await batches.refresh(batch.id)).toMatchObject({
      record: { state: "pending" },
    });
    sim.controls.advance(chain, 3);
    // One look moves it as far as the evidence shows (confirmed), the next completes it.
    expect(await batches.refresh(batch.id)).toMatchObject({
      record: { state: "confirmed" },
    });
    const done = await batches.refresh(batch.id);
    expect(done).toMatchObject({ ok: true, record: { state: "complete" } });
    const paid = await referrals.rewards.payouts.payout(a.payout.id);
    expect(paid).toMatchObject({ executor: "staff-batch", state: "complete" });
    expect(paid?.executorRef).toBe(done.ok ? done.record.transactionId : "");
    expect(await batches.refresh(batch.id)).toMatchObject({ ok: true });
    expect(
      (
        await referrals.rewards.balances.balance({
          assetKey: feeAsset,
          beneficiaryId: a.referrer,
          programKey: referralProgramKey,
        })
      ).paid,
    ).toBe(300n);
  });

  it("refuses a signature that is not of what was shown, and nothing moves", async () => {
    await clearQueue();
    const a = await waitingPayout(10_000n, addressOf("0a0b0c"));
    const { batch } = await need(start());
    const signed = sign(batch);
    expect(
      await batches.submit({
        batchId: batch.id,
        signed: { ...signed, payload: signed.payload.replace(":300", ":900") },
        staffId: staff.id,
      }),
    ).toMatchObject({ code: "invalid-signature", ok: false });
    expect((await batches.get(batch.id))?.state).toBe("awaiting_signature");
    expect(await stateOf(a.payout.id)).toBe("requested");
    for (const id of ["no-such", "", crypto.randomUUID()])
      expect(
        await batches.submit({ batchId: id, signed, staffId: staff.id }),
      ).toEqual({ code: "not-found", ok: false });
    expect(await batches.get("no-such")).toBeNull();
    expect(await batches.refresh("no-such")).toEqual({
      code: "not-found",
      ok: false,
    });
  });

  it("lets a batch that was never signed expire, lets go of its payouts for the next one, and starts a new one", async () => {
    await clearQueue();
    const a = await waitingPayout(10_000n, addressOf("0a0b0c"));
    const first = await need(start());
    clock.now = new Date(first.batch.expiresAt.getTime() + 1);
    expect(
      await batches.submit({
        batchId: first.batch.id,
        signed: sign(first.batch),
        staffId: staff.id,
      }),
    ).toMatchObject({ code: "expired", ok: false });
    const second = await need(start());
    expect(second.batch.id).not.toBe(first.batch.id);
    expect(second.batch.payoutIds).toEqual([a.payout.id]);
    expect((await batches.get(first.batch.id))?.state).toBe("expired");
  });

  it("puts the payouts back in the pot when the network reverted the batch, so they can be asked for again", async () => {
    await clearQueue();
    const a = await waitingPayout(10_000n, addressOf("0a0b0c"));
    const { batch } = await need(start());
    const sent = await batches.submit({
      batchId: batch.id,
      signed: sign(batch),
      staffId: staff.id,
    });
    if (!sent.ok || sent.record.transactionId === null)
      throw new Error("not sent");
    sim.controls.revert({ chain, id: sent.record.transactionId });
    const ended = await batches.refresh(batch.id);
    expect(ended).toMatchObject({
      ok: true,
      record: {
        failureReason: "reverted by the network",
        state: "indexed_failure",
      },
    });
    expect(await stateOf(a.payout.id)).toBe("failed");
    expect(
      (
        await referrals.rewards.balances.balance({
          assetKey: feeAsset,
          beneficiaryId: a.referrer,
          programKey: referralProgramKey,
        })
      ).payable,
    ).toBe(300n);
  });

  it("is refused when the network does not take it, and the payouts stay waiting for the next batch", async () => {
    await clearQueue();
    const a = await waitingPayout(10_000n, addressOf("0a0b0c"));
    const { batch } = await need(start());
    sim.controls.failNext(chain, "rejected");
    expect(
      await batches.submit({
        batchId: batch.id,
        signed: sign(batch),
        staffId: staff.id,
      }),
    ).toMatchObject({ ok: true, record: { state: "broadcast_rejected" } });
    // Nothing was handed over, so the payout is simply still waiting, and the next batch takes it.
    expect(await stateOf(a.payout.id)).toBe("requested");
    clock.now = new Date(clock.now.getTime() + 1_000);
    const next = await need(start());
    expect(next.batch.payoutIds).toEqual([a.payout.id]);
  });
});
