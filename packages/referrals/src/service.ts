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

// Everything the platform does with referrals: codes, the link made when an account is made, freezing, and the cut a claim earns.
export interface Referrals {
  readonly accrual: ReferralAccrual;
  readonly codes: Codes;
  readonly freezes: Freezes;
  readonly linkNewAccount: typeof linkNewAccount;
  readonly rewards: Rewards;
}

export function createReferrals(
  dependencies: ReferralsDependencies,
): Referrals {
  const { clock, database, feeAssetKey, newId, randomCode } = dependencies;
  const rewards = createReferralRewards(dependencies);
  const freezes = createFreezes({ clock, database, newId });
  return {
    accrual: createReferralAccrual({ database, feeAssetKey, freezes, rewards }),
    codes: createCodes({
      database,
      ...(randomCode === undefined ? {} : { randomCode }),
    }),
    freezes,
    linkNewAccount,
    rewards,
  };
}
