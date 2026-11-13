import type { DatabaseClient } from "@frostbite/database/connection";

import { createAccrual } from "./accrual.ts";
import { createBalances } from "./balances.ts";
import { createDispatcher, type ExecutorRegistry } from "./executors.ts";
import type { KindRegistry } from "./kinds.ts";
import { createPayouts } from "./payouts.ts";
import { createPrograms, type RewardsPolicy } from "./programs.ts";

export interface RewardsDependencies {
  readonly clock: () => Date;
  readonly database: DatabaseClient;
  readonly executors: ExecutorRegistry;
  readonly kinds: KindRegistry;
  readonly newId: () => string;
  readonly policy: RewardsPolicy;
}

// Everything the platform does with rewards, put together from the parts: programs (settings), accrual (events into earnings, and their
// reversal), balances (what a person has), payouts (asking to be paid, and the life of a payout) and the dispatcher that hands a payout to
// the executor for its asset. The platform builds one of these, with the kinds and executors it has.
export function createRewards(dependencies: RewardsDependencies) {
  const { clock, database, executors, kinds, newId, policy } = dependencies;
  const programs = createPrograms({
    clock,
    database,
    newId,
    policy,
    registry: kinds,
  });
  const payouts = createPayouts({ clock, database, newId, programs });
  return {
    accrual: createAccrual({
      clock,
      database,
      newId,
      programs,
      registry: kinds,
    }),
    balances: createBalances({ clock, database }),
    dispatcher: createDispatcher({ executors, payouts }),
    payouts,
    programs,
  };
}

export type Rewards = ReturnType<typeof createRewards>;
