import type { DatabaseClient } from "@frostbite/database/connection";
import { referralLinks } from "@frostbite/database/schema/referrals";
import type { Rewards } from "@frostbite/rewards";
import { eq } from "drizzle-orm";

import type { Freezes } from "./freezes.ts";
import { claimCompletedEvent } from "./kind.ts";
import type { CompletedClaim } from "./types.ts";

export interface ReferralAccrualDependencies {
  readonly database: DatabaseClient;
  // What a platform fee on a chain is an amount of, as the ledger's asset key (the chain's own native asset).
  readonly feeAssetKey: (chain: string) => string;
  readonly freezes: Pick<Freezes, "isFrozen">;
  readonly rewards: Pick<Rewards, "accrual">;
}

// Tells the reward programs that a claim took effect, with what they may need of it: the fee it carried, who minted and who brought them.
// Every claim is told (a program that has no use for it earns nothing), and telling the same claim again earns nothing more, because an
// earning is unique by its claim: so this may be called again after a failure, from any caller that sees a claim complete.
export function createReferralAccrual(
  dependencies: ReferralAccrualDependencies,
) {
  const { database, feeAssetKey, freezes, rewards } = dependencies;
  return {
    async claimCompleted(claim: CompletedClaim) {
      const [link] = await database
        .select({ referrerId: referralLinks.referrerId })
        .from(referralLinks)
        .where(eq(referralLinks.referredUserId, claim.userId));
      const referrer = link?.referrerId ?? null;
      return rewards.accrual.accrue({
        id: claim.claimId,
        occurredAt: claim.completedAt,
        payload: {
          asset: feeAssetKey(claim.chain),
          claimId: claim.claimId,
          fee: claim.platformFee.toString(),
          gameId: claim.gameId,
          milestoneId: claim.milestoneId,
          minter: claim.userId,
          referrer,
          referrerFrozen:
            referrer === null ? false : await freezes.isFrozen(referrer),
        },
        type: claimCompletedEvent,
      });
    },
  };
}

export type ReferralAccrual = ReturnType<typeof createReferralAccrual>;
