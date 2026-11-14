import type { DatabaseClient } from "@frostbite/database/connection";
import { authUsers } from "@frostbite/database/schema/auth";
import type { Page, Payout, Rewards } from "@frostbite/rewards";
import { eq } from "drizzle-orm";

import type { Codes } from "./codes.ts";
import { countReferred, type ReferredCounts } from "./counts.ts";
import { describeEarnings, type EarningState } from "./earnings.ts";
import type { Freeze, Freezes } from "./freezes.ts";
import { claimIdOfSource, referralProgramKey } from "./kind.ts";
import { potsOf, type Pot } from "./pot.ts";
import { claimsBehind, type ClaimBehind } from "./referrers.ts";

// One earning as an admin sees it: where it stands, and the claim it was for, so the figure can be followed to the mint behind it.
export interface AdminEarning {
  readonly amount: bigint;
  readonly assetKey: string;
  readonly at: Date;
  readonly claim: ClaimBehind | null;
  readonly id: string;
  readonly state: EarningState;
}

export interface ReferrerDetail extends ReferredCounts {
  readonly code: string | null;
  readonly earnings: Page<AdminEarning>;
  readonly freezes: readonly Freeze[];
  readonly frozen: boolean;
  readonly name: string;
  readonly payouts: readonly Payout[];
  readonly pots: readonly Pot[];
  readonly referrerId: string;
}

const payoutsShown = 20;
const freezesShown = 20;

// One referrer, whole: their counts, pot, the log of freezes with the reason of each, their payouts, and a page of earnings each followed
// to its claim. For staff, who may see who a person is; the referrer's own view (`mine`) never shows a minted milestone.
export function createReferrerDetail(dependencies: {
  readonly clock: () => Date;
  readonly codes: Pick<Codes, "existing">;
  readonly database: DatabaseClient;
  readonly freezes: Pick<Freezes, "history" | "isFrozen">;
  readonly rewards: Pick<Rewards, "balances" | "payouts">;
}) {
  const { clock, codes, database, freezes, rewards } = dependencies;
  return async function detail(
    referrerId: string,
    options: { readonly after?: string | null; readonly limit?: number } = {},
  ): Promise<ReferrerDetail | null> {
    const [user] = await database
      .select({ name: authUsers.name })
      .from(authUsers)
      .where(eq(authUsers.id, referrerId));
    if (user === undefined) return null;
    const [code, counts, frozen, history, pots, payouts, page] =
      await Promise.all([
        codes.existing(referrerId),
        countReferred(database, referrerId),
        freezes.isFrozen(referrerId),
        freezes.history(referrerId, freezesShown),
        potsOf(database, rewards, referrerId),
        rewards.payouts.listFor(referrerId, referralProgramKey, payoutsShown),
        rewards.balances.entries(referrerId, referralProgramKey, options),
      ]);
    const described = await describeEarnings(rewards, page.items, clock());
    const claims = await claimsBehind(
      database,
      described.flatMap(({ entry }) => claimIdOfSource(entry.sourceKey) ?? []),
    );
    return {
      ...counts,
      code,
      earnings: {
        items: described.map(({ entry, state }) => {
          const claimId = claimIdOfSource(entry.sourceKey);
          return {
            amount: entry.amount,
            assetKey: entry.assetKey,
            at: entry.occurredAt,
            claim: claimId === null ? null : (claims.get(claimId) ?? null),
            id: entry.id,
            state,
          };
        }),
        next: page.next,
      },
      freezes: history,
      frozen,
      name: user.name,
      payouts,
      pots,
      referrerId,
    };
  };
}
