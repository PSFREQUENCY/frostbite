import { describe, expect, it } from "vitest";

import {
  advance,
  freshProgram,
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

registerDatabase();

const key = (referrer: string, programKey: string) => ({
  assetKey: sats,
  beneficiaryId: referrer,
  programKey,
});

async function earn(options: { maturitySeconds?: number } = {}, fee = 10_000n) {
  const referrer = await seedUser();
  const programKey = freshProgram();
  await startProgram(programKey, options);
  const event = saleEvent(referrer, fee);
  await rewards.accrual.accrue(event);
  return { event, programKey, referrer };
}

describe("undoing an earning", () => {
  it("adds an entry of the opposite amount that names the earning, and leaves the earning alone", async () => {
    const { event, programKey, referrer } = await earn();
    const result = await rewards.accrual.reverse({
      programKey,
      sourceKey: `sale:${event.id}`,
    });
    expect(result.kind).toBe("reversed");
    const [original, reversal] = await entriesOf(referrer, programKey);
    expect(original).toMatchObject({ amount: 300n, kind: "accrual" });
    expect(reversal).toMatchObject({
      amount: -300n,
      kind: "reversal",
      reversesEntryId: original?.id,
      settingId: original?.settingId,
      sourceKey: `reversal:${original?.id ?? ""}`,
    });
    expect(
      await expectTotalsToMatchEntries(referrer, programKey),
    ).toMatchObject({ unpaid: 0n });
  });

  it("makes the two net to nothing in the payable pot", async () => {
    const { event, programKey, referrer } = await earn();
    await rewards.accrual.reverse({
      programKey,
      sourceKey: `sale:${event.id}`,
    });
    expect(await rewards.balances.balance(key(referrer, programKey))).toEqual({
      inFlight: 0n,
      maturing: 0n,
      paid: 0n,
      payable: 0n,
    });
  });

  it("matures a reversal of an earning that is still maturing together with it, so neither is payable alone", async () => {
    const { event, programKey, referrer } = await earn({
      maturitySeconds: 3_600,
    });
    await rewards.accrual.reverse({
      programKey,
      sourceKey: `sale:${event.id}`,
    });
    const [original, reversal] = await entriesOf(referrer, programKey);
    expect(reversal?.payableAt).toEqual(original?.payableAt);
    expect(
      await rewards.balances.balance(key(referrer, programKey)),
    ).toMatchObject({
      maturing: 0n,
      payable: 0n,
    });
    advance(3_601);
    expect(
      await rewards.balances.balance(key(referrer, programKey)),
    ).toMatchObject({
      maturing: 0n,
      payable: 0n,
    });
  });

  it("is payable at once when the earning had already matured", async () => {
    const { event, programKey, referrer } = await earn({ maturitySeconds: 60 });
    advance(120);
    await rewards.accrual.reverse({
      programKey,
      sourceKey: `sale:${event.id}`,
    });
    const [, reversal] = await entriesOf(referrer, programKey);
    expect(reversal?.payableAt).toEqual(reversal?.occurredAt);
  });

  it("is done once: a second reversal of the same earning, even at the same moment, writes nothing", async () => {
    const { event, programKey, referrer } = await earn();
    const input = { programKey, sourceKey: `sale:${event.id}` };
    const results = await Promise.all([
      rewards.accrual.reverse(input),
      rewards.accrual.reverse(input),
      rewards.accrual.reverse(input),
    ]);
    expect(results.filter(({ kind }) => kind === "reversed")).toHaveLength(1);
    expect(
      results.filter(({ kind }) => kind === "already-reversed"),
    ).toHaveLength(2);
    expect(await entriesOf(referrer, programKey)).toHaveLength(2);
    await expectTotalsToMatchEntries(referrer, programKey);
  });

  it("says so when there is no such earning, or the entry is itself a reversal", async () => {
    const { event, programKey, referrer } = await earn();
    expect(
      await rewards.accrual.reverse({ programKey, sourceKey: "sale:nothing" }),
    ).toEqual({ kind: "not-found" });
    await rewards.accrual.reverse({
      programKey,
      sourceKey: `sale:${event.id}`,
    });
    const [, reversal] = await entriesOf(referrer, programKey);
    expect(
      await rewards.accrual.reverse({
        programKey,
        sourceKey: reversal?.sourceKey ?? "",
      }),
    ).toEqual({ kind: "not-found" });
  });

  it("lets a person's later earnings pay off a debt from an earning reversed after it was paid", async () => {
    const { event, programKey, referrer } = await earn();
    const paid = await rewards.payouts.request({
      assetKey: sats,
      beneficiaryId: referrer,
      destination: "sim:one:abc",
      programKey,
    });
    expect(paid.kind).toBe("requested");
    await rewards.accrual.reverse({
      programKey,
      sourceKey: `sale:${event.id}`,
    });
    // The earning is in a payout, so the reversal is a debt in the pot: nothing payable, and what is owed shows below zero.
    const debt = await rewards.balances.balance(key(referrer, programKey));
    expect(debt.payable).toBe(-300n);
    await rewards.accrual.accrue(saleEvent(referrer, 20_000n));
    expect(
      (await rewards.balances.balance(key(referrer, programKey))).payable,
    ).toBe(300n);
    await expectTotalsToMatchEntries(referrer, programKey);
  });
});
