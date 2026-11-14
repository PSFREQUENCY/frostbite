import type { DatabaseClient } from "@frostbite/database/connection";
import {
  createExecutorRegistry,
  createKindRegistry,
  createRewards,
  type Rewards,
  type RewardsPolicy,
} from "@frostbite/rewards";

import { createReferralAccrual, type ReferralAccrual } from "./accrual.ts";
import { createCodes, type Codes } from "./codes.ts";
import { createMine, type MineReader } from "./mine.ts";
import { createOverview, type Overview } from "./overview.ts";
import { createProgram, type Program } from "./program.ts";
import {
  createReferrerDetail,
  type ReferrerDetail,
} from "./referrer-detail.ts";
import {
  createReferrers,
  type ReferrersPage,
  type ReferrersQuery,
} from "./referrers.ts";
import { createFreezes, type Freezes } from "./freezes.ts";
import { referralCut } from "./kind.ts";
import { linkNewAccount } from "./links.ts";

// What the platform decides about referrals, apart from the database and the clock: the ceilings an admin may not set the program past
// (policy, not code).
export interface ReferralsConfig {
  readonly policy: RewardsPolicy;
}

export interface ReferralsDependencies extends ReferralsConfig {
  // What a platform fee on a chain is an amount of, as the ledger's asset key: the chain's own coin, which only the chain's setup knows.
  readonly feeAssetKey: (chain: string) => string;
  readonly clock: () => Date;
  readonly database: DatabaseClient;
  readonly newId: () => string;
  // Replaceable so a test can know the codes.
  readonly randomCode?: () => string;
}

// The reward ledger as the referral program uses it: the one kind it earns by, and no executor yet (paying comes with REF-1d).
export function createReferralRewards(
  dependencies: Pick<
    ReferralsDependencies,
    "clock" | "database" | "newId" | "policy"
  >,
): Rewards {
  return createRewards({
    ...dependencies,
    executors: createExecutorRegistry([]),
    kinds: createKindRegistry([referralCut]),
  });
}

// What a person or an admin looks at and changes, which needs no chain: the program, codes, freezes, and the views of the ledger. The pages of
// the platform are made with this alone; the claims, which know what a fee is an amount of, add the cut they earn on top (`createReferrals`).
export interface ReferralReads {
  // What staff see: the program in numbers, who the referrers are, and one of them whole.
  readonly admin: {
    readonly overview: () => Promise<Overview>;
    readonly referrer: (
      referrerId: string,
      options?: { readonly after?: string | null; readonly limit?: number },
    ) => Promise<ReferrerDetail | null>;
    readonly referrers: (query: ReferrersQuery) => Promise<ReferrersPage>;
  };
  readonly codes: Codes;
  readonly freezes: Freezes;
  // What a referrer sees of themselves: their code, counts, pot and history.
  readonly mine: MineReader;
  // The program in force, and how an admin sets it.
  readonly program: Program;
  readonly rewards: Rewards;
}

export function createReferralReads(
  dependencies: Pick<
    ReferralsDependencies,
    "clock" | "database" | "newId" | "policy" | "randomCode"
  >,
): ReferralReads {
  const { clock, database, newId, randomCode } = dependencies;
  const rewards = createReferralRewards(dependencies);
  const freezes = createFreezes({ clock, database, newId });
  const codes = createCodes({
    database,
    ...(randomCode === undefined ? {} : { randomCode }),
  });
  return {
    admin: {
      overview: createOverview({ clock, database }),
      referrer: createReferrerDetail({
        clock,
        codes,
        database,
        freezes,
        rewards,
      }),
      referrers: createReferrers({ database }),
    },
    codes,
    freezes,
    mine: createMine({ clock, codes, database, freezes, rewards }),
    program: createProgram(rewards),
    rewards,
  };
}

// Everything the platform does with referrals: the reads above, the link made when an account is made, and the cut a claim earns.
export interface Referrals extends ReferralReads {
  readonly accrual: ReferralAccrual;
  readonly linkNewAccount: typeof linkNewAccount;
}

export function createReferrals(
  dependencies: ReferralsDependencies,
): Referrals {
  const { database, feeAssetKey } = dependencies;
  const reads = createReferralReads(dependencies);
  return {
    ...reads,
    accrual: createReferralAccrual({
      database,
      feeAssetKey,
      freezes: reads.freezes,
      rewards: reads.rewards,
    }),
    linkNewAccount,
  };
}
