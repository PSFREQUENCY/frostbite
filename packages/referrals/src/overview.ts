import { onlyRow } from "@frostbite/rewards";
import type { DatabaseClient } from "@frostbite/database/connection";
import { gameMilestoneClaims } from "@frostbite/database/schema/game-claims";
import {
  referralFreezes,
  referralLinks,
} from "@frostbite/database/schema/referrals";
import {
  rewardBalances,
  rewardEntries,
} from "@frostbite/database/schema/rewards";
import {
  and,
  count,
  countDistinct,
  desc,
  eq,
  exists,
  gt,
  isNull,
  sum,
} from "drizzle-orm";

import { referralProgramKey } from "./kind.ts";
import { largestFirst } from "./pot.ts";

// What the platform owes in one asset: `payable` can be paid now, `maturing` is still waiting out the delay, `inFlight` is in a payout that
// is not over, `paid` has been paid. `owed` is what the platform still has to pay: payable, maturing and in flight together.
export interface AssetTotals {
  readonly assetKey: string;
  readonly inFlight: bigint;
  readonly maturing: bigint;
  readonly owed: bigint;
  readonly paid: bigint;
  readonly payable: bigint;
}

export interface Overview {
  readonly assets: readonly AssetTotals[];
  // Referrers whose newest freeze is a freeze.
  readonly frozen: number;
  // Accounts brought by someone, and how many of them have completed a claim.
  readonly minted: number;
  readonly referred: number;
  // People who have brought at least one account.
  readonly referrers: number;
}

const total = (value: string | null): bigint => BigInt(value ?? "0");

// The program in numbers, for the admin's first page. Totals of money come from the balances the ledger keeps, never from adding up
// entries; what is still maturing is the one range read of unpaid entries not yet payable.
export function createOverview(dependencies: {
  readonly clock: () => Date;
  readonly database: DatabaseClient;
}) {
  const { clock, database } = dependencies;
  return async function overview(): Promise<Overview> {
    const links = onlyRow(
      await database
        .select({
          referred: count(),
          referrers: countDistinct(referralLinks.referrerId),
        })
        .from(referralLinks),
      "count of referrals",
    );
    const minted = onlyRow(
      await database
        .select({ value: count() })
        .from(referralLinks)
        .where(
          exists(
            database
              .select({ one: gameMilestoneClaims.id })
              .from(gameMilestoneClaims)
              .where(
                and(
                  eq(gameMilestoneClaims.userId, referralLinks.referredUserId),
                  eq(gameMilestoneClaims.state, "complete"),
                ),
              ),
          ),
        ),
      "count of referred people who minted",
    );
    const newestFreezes = database
      .selectDistinctOn([referralFreezes.referrerId], {
        frozen: referralFreezes.frozen,
      })
      .from(referralFreezes)
      .orderBy(
        referralFreezes.referrerId,
        desc(referralFreezes.createdAt),
        desc(referralFreezes.id),
      )
      .as("newest_freezes");
    const frozen = onlyRow(
      await database
        .select({ value: count() })
        .from(newestFreezes)
        .where(eq(newestFreezes.frozen, true)),
      "count of frozen referrers",
    );
    const balances = await database
      .select({
        assetKey: rewardBalances.assetKey,
        inFlight: sum(rewardBalances.inFlight),
        paid: sum(rewardBalances.paid),
        unpaid: sum(rewardBalances.unpaid),
      })
      .from(rewardBalances)
      .where(eq(rewardBalances.programKey, referralProgramKey))
      .groupBy(rewardBalances.assetKey);
    const waiting = await database
      .select({
        assetKey: rewardEntries.assetKey,
        total: sum(rewardEntries.amount),
      })
      .from(rewardEntries)
      .where(
        and(
          eq(rewardEntries.programKey, referralProgramKey),
          isNull(rewardEntries.payoutId),
          gt(rewardEntries.payableAt, clock()),
        ),
      )
      .groupBy(rewardEntries.assetKey);
    const maturingOf = new Map(
      waiting.map(({ assetKey, total: amount }) => [assetKey, total(amount)]),
    );
    const assets = balances
      .map((row): AssetTotals => {
        const unpaid = total(row.unpaid);
        const inFlight = total(row.inFlight);
        const maturing = maturingOf.get(row.assetKey) ?? 0n;
        return {
          assetKey: row.assetKey,
          inFlight,
          maturing,
          owed: unpaid + inFlight,
          paid: total(row.paid),
          payable: unpaid - maturing,
        };
      })
      .sort((a, b) => largestFirst(a.owed, b.owed));
    return {
      assets,
      frozen: frozen.value,
      minted: minted.value,
      referred: links.referred,
      referrers: links.referrers,
    };
  };
}
