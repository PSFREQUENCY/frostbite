import type { DatabaseClient } from "@frostbite/database/connection";
import {
  rewardEntries,
  rewardPayoutTransitions,
  rewardPayouts,
} from "@frostbite/database/schema/rewards";
import { eq } from "drizzle-orm";

import { onlyRow } from "./rows.ts";
import type { Payout, PayoutState } from "./types.ts";

export interface PayoutStoreDependencies {
  readonly clock: () => Date;
  readonly database: DatabaseClient;
  readonly newId: () => string;
}

export type MoveResult =
  | { readonly kind: "moved" | "unchanged"; readonly payout: Payout }
  | { readonly kind: "conflict" | "wrong-state"; readonly payout: Payout }
  | { readonly kind: "not-found" };

// Who did it: a staff account, or none for the platform itself.
export type Who = { readonly actorId?: string | null };

export type PayoutRow = typeof rewardPayouts.$inferSelect;

export const toPayout = (row: PayoutRow): Payout => ({
  amount: row.amount,
  assetKey: row.assetKey,
  beneficiaryId: row.beneficiaryId,
  completedAt: row.completedAt,
  createdAt: row.createdAt,
  destination: row.destination,
  executor: row.executor,
  executorRef: row.executorRef,
  failureReason: row.failureReason,
  id: row.id,
  programKey: row.programKey,
  // The table's own check allows only these states.
  state: row.state as PayoutState,
  updatedAt: row.updatedAt,
});

// What every move of a payout does the same way: take the payout's row under a lock, change it, and write the move down. One transaction per
// move, so the row, the entries and the audit never disagree.
export function createPayoutStore(dependencies: PayoutStoreDependencies) {
  const { clock, database, newId } = dependencies;

  type Transaction = Parameters<Parameters<typeof database.transaction>[0]>[0];

  async function record(
    transaction: Transaction,
    payoutId: string,
    from: PayoutState | null,
    to: PayoutState,
    who: Who,
    reason: string | null,
  ): Promise<void> {
    await transaction.insert(rewardPayoutTransitions).values({
      actorId: who.actorId ?? null,
      at: clock(),
      fromState: from,
      id: newId(),
      payoutId,
      reason,
      toState: to,
    });
  }

  return {
    async change(
      transaction: Transaction,
      row: PayoutRow,
      to: PayoutState,
      who: Who,
      reason: string | null,
      set: Partial<typeof rewardPayouts.$inferInsert>,
    ): Promise<Payout> {
      const updated = onlyRow(
        await transaction
          .update(rewardPayouts)
          .set({ ...set, state: to, updatedAt: clock() })
          .where(eq(rewardPayouts.id, row.id))
          .returning(),
        "payout",
      );
      await record(transaction, row.id, toPayout(row).state, to, who, reason);
      return toPayout(updated);
    },

    async move(
      id: string,
      run: (transaction: Transaction, row: PayoutRow) => Promise<MoveResult>,
    ): Promise<MoveResult> {
      return database.transaction(async (transaction) => {
        const [row] = await transaction
          .select()
          .from(rewardPayouts)
          .where(eq(rewardPayouts.id, id))
          .for("update");
        if (row === undefined) return { kind: "not-found" } as const;
        return run(transaction, row);
      });
    },

    record,

    // Lets a payout's entries go back to the pot, before it ends without paying.
    release: (transaction: Transaction, payoutId: string) =>
      transaction
        .update(rewardEntries)
        .set({ payoutId: null })
        .where(eq(rewardEntries.payoutId, payoutId)),
  };
}

export type PayoutStore = ReturnType<typeof createPayoutStore>;
