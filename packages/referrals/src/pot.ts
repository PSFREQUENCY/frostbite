import type { DatabaseClient } from "@frostbite/database/connection";
import { rewardBalances } from "@frostbite/database/schema/rewards";
import type { Balance, Rewards } from "@frostbite/rewards";
import { and, eq } from "drizzle-orm";

import { referralProgramKey } from "./kind.ts";

// For sorting amounts, the largest first (bigints cannot be subtracted into a sort result without losing their size).
export const largestFirst = (a: bigint, b: bigint): number =>
  a === b ? 0 : a < b ? 1 : -1;

// What a person has under the referral program in one asset.
export interface Pot extends Balance {
  readonly assetKey: string;
}

// A person's pot in every asset they have earned in, the asset with the most waiting first. A person who has earned nothing has none.
export async function potsOf(
  database: DatabaseClient,
  rewards: Pick<Rewards, "balances">,
  userId: string,
): Promise<readonly Pot[]> {
  const rows = await database
    .select({ assetKey: rewardBalances.assetKey })
    .from(rewardBalances)
    .where(
      and(
        eq(rewardBalances.beneficiaryId, userId),
        eq(rewardBalances.programKey, referralProgramKey),
      ),
    );
  const pots = await Promise.all(
    rows.map(async ({ assetKey }) => ({
      ...(await rewards.balances.balance({
        assetKey,
        beneficiaryId: userId,
        programKey: referralProgramKey,
      })),
      assetKey,
    })),
  );
  return [...pots].sort((a, b) => largestFirst(a.payable, b.payable));
}
