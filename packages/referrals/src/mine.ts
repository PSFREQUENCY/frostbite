import type { DatabaseClient } from "@frostbite/database/connection";
import type { Page, PayoutState, Rewards } from "@frostbite/rewards";

import { describeEarnings, type EarningState } from "./earnings.ts";
import type { Codes } from "./codes.ts";
import { countReferred, type ReferredCounts } from "./counts.ts";
import type { Freezes } from "./freezes.ts";
import { referralProgramKey } from "./kind.ts";
import { potsOf, type Pot } from "./pot.ts";

export interface MineDependencies {
  readonly codes: Pick<Codes, "ensure">;
  readonly database: DatabaseClient;
  readonly freezes: Pick<Freezes, "isFrozen">;
  readonly rewards: Pick<Rewards, "balances" | "payouts">;
}

// What a referrer sees of their own program: their code, how many came and minted, the pot, and whether earning is paused.
export interface Mine extends ReferredCounts {
  readonly code: string;
  readonly frozen: boolean;
  readonly pots: readonly Pot[];
}

// A row of the history. It says when, how much and where it stands, and nothing of who minted or what: the referrer never learns that.
export interface HistoryRow {
  readonly amount: bigint;
  readonly assetKey: string;
  readonly at: Date;
  readonly id: string;
  readonly state: EarningState;
}

export interface PayoutRow {
  readonly amount: bigint;
  readonly assetKey: string;
  readonly at: Date;
  readonly id: string;
  readonly state: PayoutState;
}

export interface History {
  readonly entries: Page<HistoryRow>;
  // The payouts asked for, newest first; only the first page of the history carries them.
  readonly payouts: readonly PayoutRow[];
}

const payoutsShown = 20;

// A person's view of their own referrals. Everything here is keyed by the person asking, so nobody can be shown another's.
export function createMine(
  dependencies: MineDependencies & { readonly clock: () => Date },
) {
  const { clock, codes, database, freezes, rewards } = dependencies;

  return {
    // A person's page. Makes their code the first time, so the page always has a link to show.
    async summary(userId: string): Promise<Mine> {
      const [code, counts, frozen, pots] = await Promise.all([
        codes.ensure(userId),
        countReferred(database, userId),
        freezes.isFrozen(userId),
        potsOf(database, rewards, userId),
      ]);
      return { ...counts, code, frozen, pots };
    },

    // Their earnings a page at a time, newest first, and the payouts they asked for.
    async history(
      userId: string,
      options: { readonly after?: string | null; readonly limit?: number } = {},
    ): Promise<History> {
      const page = await rewards.balances.entries(
        userId,
        referralProgramKey,
        options,
      );
      const described = await describeEarnings(rewards, page.items, clock());
      const first = options.after === undefined || options.after === null;
      return {
        entries: {
          items: described.map(({ entry, state }) => ({
            amount: entry.amount,
            assetKey: entry.assetKey,
            at: entry.occurredAt,
            id: entry.id,
            state,
          })),
          next: page.next,
        },
        payouts: first
          ? (
              await rewards.payouts.listFor(
                userId,
                referralProgramKey,
                payoutsShown,
              )
            ).map((payout) => ({
              amount: payout.amount,
              assetKey: payout.assetKey,
              at: payout.createdAt,
              id: payout.id,
              state: payout.state,
            }))
          : [],
      };
    },
  };
}

export type MineReader = ReturnType<typeof createMine>;
