import { describe, expect, it } from "vitest";

import { advance, registerDatabase, rewards } from "./support/fixture.ts";
import {
  entriesOf,
  expectTotalsToMatchEntries,
} from "./support/ledger-checks.ts";
import { ask, key, requested } from "./support/payouts-fixture.ts";
import { saleEvent } from "./support/fixture.ts";

registerDatabase();

describe("the life of a payout", () => {
  it("moves requested, in progress, complete, and counts the amount as paid", async () => {
    const { payout, programKey, referrer } = await requested();
    advance(1);
    const begun = await rewards.payouts.begin(payout.id, {
      actorId: null,
      executor: "test-executor",
    });
    expect(begun).toMatchObject({
      kind: "moved",
      payout: { executor: "test-executor", state: "in_progress" },
    });
    advance(1);
    const done = await rewards.payouts.complete(payout.id, { ref: "tx-1" });
    expect(done).toMatchObject({
      kind: "moved",
      payout: { executorRef: "tx-1", state: "complete" },
    });
    expect(await rewards.balances.balance(key(referrer, programKey))).toEqual({
      inFlight: 0n,
      maturing: 0n,
      paid: 3_000n,
      payable: 0n,
    });
    await expectTotalsToMatchEntries(referrer, programKey);
    const moves = await rewards.payouts.transitions(payout.id);
    expect(moves.map(({ toState }) => toState)).toEqual([
      "requested",
      "in_progress",
      "complete",
    ]);
  });

  it("can be asked for again after one is paid", async () => {
    const { payout, programKey, referrer } = await requested();
    await rewards.payouts.begin(payout.id, { executor: "test-executor" });
    await rewards.payouts.complete(payout.id, { ref: "tx-1" });
    await rewards.accrual.accrue(saleEvent(referrer, 100_000n));
    expect(await ask(referrer, programKey)).toMatchObject({
      kind: "requested",
      payout: { amount: 3_000n },
    });
  });

  it("changes nothing when asked to begin or complete the same way again, and refuses a different way", async () => {
    const { payout } = await requested();
    await rewards.payouts.begin(payout.id, { executor: "one" });
    expect(
      (await rewards.payouts.begin(payout.id, { executor: "one" })).kind,
    ).toBe("unchanged");
    expect(
      (await rewards.payouts.begin(payout.id, { executor: "two" })).kind,
    ).toBe("wrong-state");
    await rewards.payouts.complete(payout.id, { ref: "tx-1" });
    expect(
      (await rewards.payouts.complete(payout.id, { ref: "tx-1" })).kind,
    ).toBe("unchanged");
    expect(
      (await rewards.payouts.complete(payout.id, { ref: "tx-2" })).kind,
    ).toBe("conflict");
    expect(
      (await rewards.payouts.fail(payout.id, { reason: "late" })).kind,
    ).toBe("wrong-state");
    expect(
      (await rewards.payouts.cancel(payout.id, { reason: "late" })).kind,
    ).toBe("wrong-state");
  });

  it("refuses to complete a payout no executor has begun", async () => {
    const { payout } = await requested();
    expect(
      (await rewards.payouts.complete(payout.id, { ref: "tx-1" })).kind,
    ).toBe("wrong-state");
  });

  it("gives the entries back when it fails, so they can be asked for again, and says why", async () => {
    const { payout, programKey, referrer } = await requested();
    await rewards.payouts.begin(payout.id, { executor: "test-executor" });
    const failed = await rewards.payouts.fail(payout.id, {
      actorId: referrer,
      reason: "address-not-accepted",
    });
    expect(failed).toMatchObject({
      kind: "moved",
      payout: { failureReason: "address-not-accepted", state: "failed" },
    });
    expect(
      (await entriesOf(referrer, programKey)).every(
        ({ payoutId }) => payoutId === null,
      ),
    ).toBe(true);
    expect(
      (await rewards.balances.balance(key(referrer, programKey))).payable,
    ).toBe(3_000n);
    await expectTotalsToMatchEntries(referrer, programKey);
    expect(
      (await rewards.payouts.fail(payout.id, { reason: "again" })).kind,
    ).toBe("unchanged");
    expect((await ask(referrer, programKey)).kind).toBe("requested");
    const moves = await rewards.payouts.transitions(payout.id);
    expect(moves.at(-1)).toMatchObject({
      actorId: referrer,
      reason: "address-not-accepted",
      toState: "failed",
    });
  });

  it("can be cancelled only before an executor has it, and gives the entries back", async () => {
    const { payout, programKey, referrer } = await requested();
    expect(
      (await rewards.payouts.cancel(payout.id, { reason: "changed my mind" }))
        .kind,
    ).toBe("moved");
    expect(
      (await rewards.payouts.cancel(payout.id, { reason: "again" })).kind,
    ).toBe("unchanged");
    expect(
      (await rewards.balances.balance(key(referrer, programKey))).payable,
    ).toBe(3_000n);
    const second = await requested();
    await rewards.payouts.begin(second.payout.id, {
      executor: "test-executor",
    });
    expect(
      (await rewards.payouts.cancel(second.payout.id, { reason: "too late" }))
        .kind,
    ).toBe("wrong-state");
  });

  it("says when there is no such payout", async () => {
    const id = "8f14e45f-ceea-4b67-8a6e-2f0b9a1c5d00";
    expect(await rewards.payouts.begin(id, { executor: "x" })).toEqual({
      kind: "not-found",
    });
    expect(await rewards.payouts.complete(id, { ref: "x" })).toEqual({
      kind: "not-found",
    });
    expect(await rewards.payouts.fail(id, { reason: "x" })).toEqual({
      kind: "not-found",
    });
    expect(await rewards.payouts.cancel(id, { reason: "x" })).toEqual({
      kind: "not-found",
    });
    expect(await rewards.payouts.payout(id)).toBeNull();
  });

  it("lists what is waiting for an executor, oldest first, and no more once it is over", async () => {
    const first = await requested();
    advance(5);
    const second = await requested();
    const open = (await rewards.payouts.open()).map(({ id }) => id);
    expect(open.indexOf(first.payout.id)).toBeLessThan(
      open.indexOf(second.payout.id),
    );
    await rewards.payouts.cancel(first.payout.id, { reason: "done" });
    expect((await rewards.payouts.open()).map(({ id }) => id)).not.toContain(
      first.payout.id,
    );
    expect((await rewards.payouts.open(1)).length).toBe(1);
  });
});
