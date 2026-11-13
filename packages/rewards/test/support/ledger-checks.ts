import {
  rewardBalances,
  rewardEntries,
  rewardPayouts,
} from "@frostbite/database";
import { and, eq } from "drizzle-orm";
import { expect } from "vitest";

import { database, sats } from "./fixture.ts";

// What the pot of a person says must always equal what their entries and payouts add up to, whatever path got there: the trigger-kept
// totals are recomputed from the facts and compared. Called after every kind of move in the tests.
export async function expectTotalsToMatchEntries(
  beneficiaryId: string,
  programKey: string,
  assetKey = sats,
): Promise<{ inFlight: bigint; paid: bigint; unpaid: bigint }> {
  const entries = await database
    .select({
      amount: rewardEntries.amount,
      payoutId: rewardEntries.payoutId,
      state: rewardPayouts.state,
    })
    .from(rewardEntries)
    .leftJoin(rewardPayouts, eq(rewardPayouts.id, rewardEntries.payoutId))
    .where(
      and(
        eq(rewardEntries.beneficiaryId, beneficiaryId),
        eq(rewardEntries.programKey, programKey),
        eq(rewardEntries.assetKey, assetKey),
      ),
    );
  const sum = (keep: (entry: (typeof entries)[number]) => boolean) =>
    entries.filter(keep).reduce((total, { amount }) => total + amount, 0n);
  const expected = {
    inFlight: sum(
      ({ payoutId, state }) => payoutId !== null && state !== "complete",
    ),
    paid: sum(({ state }) => state === "complete"),
    unpaid: sum(({ payoutId }) => payoutId === null),
  };
  const [totals] = await database
    .select()
    .from(rewardBalances)
    .where(
      and(
        eq(rewardBalances.beneficiaryId, beneficiaryId),
        eq(rewardBalances.programKey, programKey),
        eq(rewardBalances.assetKey, assetKey),
      ),
    );
  expect({
    inFlight: totals?.inFlight ?? 0n,
    paid: totals?.paid ?? 0n,
    unpaid: totals?.unpaid ?? 0n,
  }).toEqual(expected);
  return expected;
}

export async function entriesOf(beneficiaryId: string, programKey: string) {
  return database
    .select()
    .from(rewardEntries)
    .where(
      and(
        eq(rewardEntries.beneficiaryId, beneficiaryId),
        eq(rewardEntries.programKey, programKey),
      ),
    )
    .orderBy(rewardEntries.createdAt, rewardEntries.id);
}
