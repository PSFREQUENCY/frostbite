import type { DatabaseClient } from "@frostbite/database/connection";
import {
  rewardPayoutTransitions,
  rewardPayouts,
} from "@frostbite/database/schema/rewards";
import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { createPayoutMoves } from "./payout-moves.ts";
import { createPayoutRequests } from "./payout-request.ts";
import { createPayoutStore, toPayout } from "./payout-store.ts";
import type { Programs } from "./programs.ts";
import type { Payout, PayoutState } from "./types.ts";

export type { MoveResult, Who } from "./payout-store.ts";
export type { PayoutRequest, RequestPayoutResult } from "./payout-request.ts";

export interface PayoutsDependencies {
  readonly clock: () => Date;
  readonly database: DatabaseClient;
  readonly newId: () => string;
  readonly programs: Programs;
}

// Asking to be paid, and the life of a payout. The platform decides WHAT is owed and the state; how it is paid is an executor's. Every rule
// here is also held by the database (see the migration), so a second writer or a bug cannot break it: the minimum is the one thing only
// this layer knows, and is checked under a lock.
export function createPayouts(dependencies: PayoutsDependencies) {
  const { clock, database, newId, programs } = dependencies;
  const store = createPayoutStore({ clock, database, newId });

  return {
    ...createPayoutMoves(store, clock),
    ...createPayoutRequests({ clock, database, newId, programs, store }),

    // Payouts waiting for, or being carried out by, an executor, oldest first.
    async open(limit = 100): Promise<readonly Payout[]> {
      const rows = await database
        .select()
        .from(rewardPayouts)
        .where(sql`${rewardPayouts.state} in ('requested', 'in_progress')`)
        .orderBy(rewardPayouts.createdAt)
        .limit(limit);
      return rows.map(toPayout);
    },

    // A person's payouts under a program, newest first.
    async listFor(
      beneficiaryId: string,
      programKey: string,
      limit = 50,
    ): Promise<readonly Payout[]> {
      const rows = await database
        .select()
        .from(rewardPayouts)
        .where(
          and(
            eq(rewardPayouts.beneficiaryId, beneficiaryId),
            eq(rewardPayouts.programKey, programKey),
          ),
        )
        .orderBy(desc(rewardPayouts.createdAt))
        .limit(limit);
      return rows.map(toPayout);
    },

    async payout(id: string): Promise<Payout | null> {
      const [row] = await database
        .select()
        .from(rewardPayouts)
        .where(eq(rewardPayouts.id, id));
      return row === undefined ? null : toPayout(row);
    },

    // The state of each of the payouts named, for a page of entries that says where each stands.
    async statesOf(ids: readonly string[]): Promise<Map<string, PayoutState>> {
      if (ids.length === 0) return new Map();
      const rows = await database
        .select()
        .from(rewardPayouts)
        .where(inArray(rewardPayouts.id, [...ids]));
      return new Map(rows.map((row) => [row.id, toPayout(row).state]));
    },

    // A payout's moves, oldest first: the audit of how it got where it is.
    async transitions(id: string) {
      return database
        .select()
        .from(rewardPayoutTransitions)
        .where(eq(rewardPayoutTransitions.payoutId, id))
        .orderBy(rewardPayoutTransitions.at);
    },
  };
}

export type Payouts = ReturnType<typeof createPayouts>;
