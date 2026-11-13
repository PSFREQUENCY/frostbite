import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { createExecutorRegistry } from "../src/executors.ts";
import { createRewards } from "../src/service.ts";
import {
  behaviour,
  clock,
  database,
  freshProgram,
  handed,
  otherAsset,
  policy,
  registerDatabase,
  rewards,
  saleEvent,
  sats,
  seedUser,
  startProgram,
} from "./support/fixture.ts";
import {
  entriesOf,
  expectTotalsToMatchEntries,
} from "./support/ledger-checks.ts";
import { createKindRegistry } from "../src/kinds.ts";
import { sale } from "./support/fixture.ts";

registerDatabase();

async function requested() {
  const referrer = await seedUser();
  const programKey = freshProgram();
  await startProgram(programKey);
  await rewards.accrual.accrue(saleEvent(referrer, 100_000n));
  const result = await rewards.payouts.request({
    assetKey: sats,
    beneficiaryId: referrer,
    destination: "sim:one:abc",
    programKey,
  });
  if (result.kind !== "requested") throw new Error("expected a payout");
  return { payout: result.payout, programKey, referrer };
}

describe("handing a payout to the executor for its asset", () => {
  it("marks the payout in progress before the executor is asked, and leaves it there when the executor will report back", async () => {
    const { payout } = await requested();
    const result = await rewards.dispatcher.dispatch(payout.id);
    expect(result).toMatchObject({
      kind: "accepted",
      payout: { executor: "test-executor", state: "in_progress" },
    });
    expect(handed).toEqual([payout.id]);
  });

  it("completes it when the executor has already paid, with what paid it", async () => {
    behaviour.kind = "complete";
    const { payout, programKey, referrer } = await requested();
    const result = await rewards.dispatcher.dispatch(payout.id);
    expect(result).toMatchObject({
      kind: "completed",
      payout: { executorRef: `tx-${payout.id}`, state: "complete" },
    });
    expect((await expectTotalsToMatchEntries(referrer, programKey)).paid).toBe(
      3_000n,
    );
  });

  it("fails it and gives the entries back when the executor refuses, saying why", async () => {
    behaviour.kind = "refuse";
    const { payout, programKey, referrer } = await requested();
    const result = await rewards.dispatcher.dispatch(payout.id);
    expect(result).toMatchObject({
      kind: "refused",
      payout: { failureReason: "address-not-accepted", state: "failed" },
    });
    expect(
      (await entriesOf(referrer, programKey)).every(
        ({ payoutId }) => payoutId === null,
      ),
    ).toBe(true);
  });

  it("leaves a payout in progress, never failed, when the executor throws, because it may have started", async () => {
    behaviour.kind = "throw";
    const { payout, programKey, referrer } = await requested();
    const result = await rewards.dispatcher.dispatch(payout.id);
    expect(result.kind).toBe("executor-error");
    if (result.kind === "executor-error")
      expect(result.error.message).toBe("the executor broke");
    expect((await rewards.payouts.payout(payout.id))?.state).toBe(
      "in_progress",
    );
    expect(
      (await expectTotalsToMatchEntries(referrer, programKey)).inFlight,
    ).toBe(3_000n);
  });

  it("names a thrown value that is not an error all the same", async () => {
    const odd = createRewards({
      clock: () => clock.now,
      database,
      executors: createExecutorRegistry([
        {
          id: "odd",
          start: () => Promise.reject("not an error"),
          supports: () => true,
        },
      ]),
      kinds: createKindRegistry([sale]),
      newId: randomUUID,
      policy,
    });
    const { payout } = await requested();
    const result = await odd.dispatcher.dispatch(payout.id);
    expect(result.kind).toBe("executor-error");
  });

  it("is not handed twice: a payout that is already with an executor is left alone", async () => {
    const { payout } = await requested();
    await rewards.dispatcher.dispatch(payout.id);
    const again = await rewards.dispatcher.dispatch(payout.id);
    expect(again).toMatchObject({
      kind: "not-requested",
      payout: { state: "in_progress" },
    });
    expect(handed).toEqual([payout.id]);
  });

  it("says so when there is no such payout", async () => {
    expect(
      await rewards.dispatcher.dispatch("8f14e45f-ceea-4b67-8a6e-2f0b9a1c5d00"),
    ).toEqual({ kind: "not-found" });
  });

  it("fails a payout, with its entries given back, when no executor pays that asset", async () => {
    const referrer = await seedUser();
    const programKey = freshProgram();
    await startProgram(programKey);
    await rewards.accrual.accrue(saleEvent(referrer, 100_000n));
    const result = await rewards.payouts.request({
      assetKey: sats,
      beneficiaryId: referrer,
      destination: "x:y:z",
      programKey,
    });
    if (result.kind !== "requested") throw new Error("expected a payout");
    const noOne = createRewards({
      clock: () => clock.now,
      database,
      executors: createExecutorRegistry([
        {
          id: "other-asset",
          start: () => Promise.resolve({ kind: "accepted" }),
          supports: (asset) => asset === otherAsset,
        },
      ]),
      kinds: createKindRegistry([sale]),
      newId: randomUUID,
      policy,
    });
    expect(await noOne.dispatcher.dispatch(result.payout.id)).toMatchObject({
      kind: "no-executor",
      payout: { failureReason: "no-executor", state: "failed" },
    });
    await expectTotalsToMatchEntries(referrer, programKey);
  });
});

describe("the executors of the platform", () => {
  it("are found by the asset they pay, and two cannot share a name", () => {
    const one = {
      id: "one",
      start: () => Promise.resolve({ kind: "accepted" as const }),
      supports: (asset: string) => asset === sats,
    };
    const two = {
      id: "two",
      start: () => Promise.resolve({ kind: "accepted" as const }),
      supports: (asset: string) => asset === otherAsset,
    };
    const registry = createExecutorRegistry([one, two]);
    expect(registry.forAsset(sats)?.id).toBe("one");
    expect(registry.forAsset(otherAsset)?.id).toBe("two");
    expect(registry.forAsset("nothing/native/here")).toBeUndefined();
    expect(registry.ids()).toEqual(["one", "two"]);
    expect(() => createExecutorRegistry([one, { ...two, id: "one" }])).toThrow(
      /Two payout executors/u,
    );
  });
});
