import { randomUUID } from "node:crypto";

import { beforeAll, describe, expect, it } from "vitest";

import { createBatchRepository } from "../src/batches/repository.ts";
import { createBatches } from "../src/batches/service.ts";

import { referralProgramKey } from "../src/kind.ts";
import {
  addressOf,
  batches,
  ports,
  signSimulated,
  sim,
  waitingPayout,
} from "./support/batches.ts";
import {
  chain,
  clock,
  database,
  feeAsset,
  referrals,
  registerDatabase,
  seedUser,
} from "./support/fixture.ts";

registerDatabase();

const treasury = addressOf("a1b2c3");
sim.controls.fund(chain, treasury, 1_000_000n);
let staff = "";
beforeAll(async () => {
  staff = await seedUser();
});
const start = (over: object = {}) =>
  batches.start({
    assetKey: feeAsset,
    sender: treasury,
    staffId: staff,
    ...over,
  });
const stateOf = async (payoutId: string) =>
  (await referrals.rewards.payouts.payout(payoutId))?.state;
const need = async (result: ReturnType<typeof start>) => {
  const answer = await result;
  if (!answer.ok) throw new Error(`not started: ${answer.code}`);
  return answer;
};
const sign = (batch: { unsigned: Parameters<typeof signSimulated>[0] }) =>
  signSimulated(batch.unsigned);
// Starts a test from nothing owed and no batch in progress: payouts that are still waiting are cancelled, and a batch that was never signed
// is let lapse (the clock goes past its time; a batch already sent is followed to its end by the test that sent it).
async function clearQueue() {
  for (const payout of await referrals.rewards.payouts.requestedIn(
    feeAsset,
    referralProgramKey,
    500,
  ))
    await referrals.rewards.payouts.cancel(payout.id, { reason: "test" });
  const lapse = (await batches.list(50)).reduce(
    (latest, { expiresAt, state }) =>
      state === "awaiting_signature" && expiresAt.getTime() > latest
        ? expiresAt.getTime()
        : latest,
    clock.now.getTime(),
  );
  clock.now = new Date(lapse + 1_000);
}

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
      staffId: staff,
    });
    expect(submitted).toMatchObject({
      ok: true,
      record: { state: "broadcast_accepted", submittedBy: staff },
    });
    expect(await stateOf(a.payout.id)).toBe("in_progress");
    // The same signed bytes again change nothing.
    expect(
      await batches.submit({
        batchId: batch.id,
        signed: sign(batch),
        staffId: staff,
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
        staffId: staff,
      }),
    ).toMatchObject({ code: "invalid-signature", ok: false });
    expect((await batches.get(batch.id))?.state).toBe("awaiting_signature");
    expect(await stateOf(a.payout.id)).toBe("requested");
    for (const id of ["no-such", "", crypto.randomUUID()])
      expect(
        await batches.submit({ batchId: id, signed, staffId: staff }),
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
        staffId: staff,
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
      staffId: staff,
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
        staffId: staff,
      }),
    ).toMatchObject({ ok: true, record: { state: "broadcast_rejected" } });
    // Nothing was handed over, so the payout is simply still waiting, and the next batch takes it.
    expect(await stateOf(a.payout.id)).toBe("requested");
    clock.now = new Date(clock.now.getTime() + 1_000);
    const next = await need(start());
    expect(next.batch.payoutIds).toEqual([a.payout.id]);
  });

  it("leaves out a payout under what the network would relay or to an address it does not accept, and says which, paying the rest", async () => {
    await clearQueue();
    const small = await waitingPayout(100n, addressOf("0a0b0c"));
    const odd = await waitingPayout(10_000n, "not-an-address");
    const fine = await waitingPayout(10_000n, addressOf("0d0e0f"));
    const answer = await need(start());
    expect(answer.batch.payoutIds).toEqual([fine.payout.id]);
    const byReason = (
      list: readonly { readonly payoutId: string; readonly reason: string }[],
    ) => [...list].sort((x, y) => x.reason.localeCompare(y.reason));
    expect(byReason(answer.skipped)).toEqual(
      byReason([
        { payoutId: small.payout.id, reason: "dust" },
        { payoutId: odd.payout.id, reason: "invalid-address" },
      ]),
    );
  });

  it("refuses to build when nothing is waiting, the sender is not an address, the chain is not served, or the sender cannot pay", async () => {
    await clearQueue();
    expect(await start()).toMatchObject({ code: "nothing-to-pay", ok: false });
    await waitingPayout(10_000n, addressOf("0a0b0c"));
    expect(await start({ sender: "nobody" })).toMatchObject({
      code: "invalid-sender",
      ok: false,
    });
    expect(await start({ assetKey: "simnet:two/native/sim" })).toMatchObject({
      code: "chain-unavailable",
      ok: false,
    });
    expect(await start({ assetKey: "garbage" })).toMatchObject({
      code: "chain-unavailable",
      ok: false,
    });
    expect(await start({ sender: addressOf("ffffff") })).toMatchObject({
      code: "cannot-pay",
      ok: false,
    });
  });

  it("refuses a batch that would cost more in network fee than it pays, stores nothing, and leaves the payouts waiting", async () => {
    await clearQueue();
    const waiting = await waitingPayout(10_000n, addressOf("0a0b0c"));
    const costly = createBatches({
      clock: () => clock.now,
      delay: { maxUnsettledMs: 3_600_000 },
      funding: () => ({
        maxFee: {
          asset: { chain, id: "sim", kind: "native" },
          baseUnits: 10n,
        },
      }),
      newId: randomUUID,
      ports: () => ({
        ...ports,
        builder: {
          ...ports.builder,
          build: async (intent, funding) => {
            const built = await ports.builder.build(intent, funding);
            return {
              ...built,
              summary: {
                ...built.summary,
                fee: { ...built.summary.fee, baseUnits: 1_000_000n },
              },
            };
          },
        },
      }),
      repository: createBatchRepository(database, { clock: () => clock.now }),
      rewards: referrals.rewards,
    });
    expect(
      await costly.start({
        assetKey: feeAsset,
        sender: treasury,
        staffId: staff,
      }),
    ).toMatchObject({ code: "costs-more-than-it-pays", ok: false });
    expect(await stateOf(waiting.payout.id)).toBe("requested");
    expect(
      (await batches.list(50)).some(({ payoutIds }) =>
        payoutIds.includes(waiting.payout.id),
      ),
    ).toBe(false);
  });
});
