import type { DatabaseClient } from "@frostbite/database/connection";
import {
  referralPayoutBatchItems,
  referralPayoutBatches,
} from "@frostbite/database/schema/referral-batches";
import {
  readTracked,
  sentAtAfter,
  trackedValues,
} from "@frostbite/shared/chain";
import { and, desc, eq, inArray, lte, notInArray, sql } from "drizzle-orm";

import { uuidPattern } from "../referrers.ts";
import type { BatchRepository, StoredBatch } from "./types.ts";

type Row = typeof referralPayoutBatches.$inferSelect;

// States in which a batch has not been signed: the wallet can still be asked, and the batch can run out of time.
const unsigned = ["constructed", "simulated", "awaiting_signature"] as const;
// A batch is over when it took effect or never will.
const settled = [
  "broadcast_rejected",
  "complete",
  "expired",
  "indexed_failure",
] as const;
// The states in which a batch ended without paying anyone.
const unpaid = new Set<string>([
  "broadcast_rejected",
  "expired",
  "indexed_failure",
]);

function toBatch(row: Row, payoutIds: readonly string[]): StoredBatch {
  const tracked = readTracked(row);
  return {
    assetKey: row.assetKey,
    broadcastAt: row.broadcastAt,
    chain: tracked.chain,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
    expiresAt: row.expiresAt,
    failureReason: row.failureReason,
    id: row.id,
    payoutIds,
    signedPayload: row.signedPayload,
    state: tracked.state,
    submittedBy: row.submittedBy,
    transactionId: row.transactionId,
    unsigned: tracked.unsigned,
    updatedAt: row.updatedAt,
  };
}

export function createBatchRepository(
  database: DatabaseClient,
  options: { readonly clock: () => Date },
): BatchRepository {
  type Reader = Pick<DatabaseClient, "select">;

  async function idsOf(
    reader: Reader,
    batchIds: readonly string[],
  ): Promise<Map<string, string[]>> {
    const held = new Map<string, string[]>(batchIds.map((id) => [id, []]));
    if (batchIds.length === 0) return held;
    const rows = await reader
      .select()
      .from(referralPayoutBatchItems)
      .where(inArray(referralPayoutBatchItems.batchId, [...batchIds]));
    for (const { batchId, payoutId } of rows) held.get(batchId)?.push(payoutId);
    return held;
  }

  const many = async (reader: Reader, rows: readonly Row[]) => {
    const ids = await idsOf(
      reader,
      rows.map(({ id }) => id),
    );
    return rows.map((row) => toBatch(row, ids.get(row.id) ?? []));
  };

  return {
    create: (batch) =>
      database.transaction(async (transaction) => {
        await transaction.execute(
          sql`select pg_advisory_xact_lock(hashtextextended(${`referral-batch:${batch.assetKey}`}, 0))`,
        );
        const now = options.clock();
        const lapsed = await transaction
          .update(referralPayoutBatches)
          .set({ state: "expired", updatedAt: now })
          .where(
            and(
              eq(referralPayoutBatches.assetKey, batch.assetKey),
              inArray(referralPayoutBatches.state, [...unsigned]),
              lte(referralPayoutBatches.expiresAt, now),
            ),
          )
          .returning({ id: referralPayoutBatches.id });
        if (lapsed.length > 0)
          await transaction
            .update(referralPayoutBatchItems)
            .set({ held: false })
            .where(
              inArray(
                referralPayoutBatchItems.batchId,
                lapsed.map(({ id }) => id),
              ),
            );
        const [open] = await transaction
          .select()
          .from(referralPayoutBatches)
          .where(
            and(
              eq(referralPayoutBatches.assetKey, batch.assetKey),
              notInArray(referralPayoutBatches.state, [...settled]),
            ),
          );
        if (open !== undefined)
          return {
            batch: (await many(transaction, [open]))[0] as StoredBatch,
            kind: "in-progress",
          } as const;
        const [row] = await transaction
          .insert(referralPayoutBatches)
          .values({
            ...trackedValues({ ...batch, contract: null }),
            assetKey: batch.assetKey,
            createdAt: batch.createdAt,
            createdBy: batch.createdBy,
            expiresAt: batch.expiresAt,
            id: batch.id,
            state: "awaiting_signature",
            updatedAt: now,
          })
          .returning();
        if (row === undefined) throw new Error("The batch was not stored.");
        await transaction.insert(referralPayoutBatchItems).values(
          batch.payoutIds.map((payoutId) => ({
            batchId: batch.id,
            payoutId,
          })),
        );
        return {
          batch: toBatch(row, batch.payoutIds),
          kind: "created",
        } as const;
      }),

    // An id that is not one (an edited address) names no batch, rather than failing in the database.
    get: async (id) => {
      if (!uuidPattern.test(id)) return null;
      const [row] = await database
        .select()
        .from(referralPayoutBatches)
        .where(eq(referralPayoutBatches.id, id));
      return row === undefined
        ? null
        : ((await many(database, [row]))[0] ?? null);
    },

    list: async (limit) =>
      many(
        database,
        await database
          .select()
          .from(referralPayoutBatches)
          .orderBy(desc(referralPayoutBatches.createdAt))
          .limit(limit),
      ),

    update: (id, decide) =>
      !uuidPattern.test(id)
        ? Promise.resolve(null)
        : database.transaction(async (transaction) => {
            const [row] = await transaction
              .select()
              .from(referralPayoutBatches)
              .where(eq(referralPayoutBatches.id, id))
              .for("update");
            if (row === undefined) return null;
            const batch = (await many(transaction, [row]))[0] as StoredBatch;
            const change = decide(batch);
            if (change === null) return batch;
            const updatedAt = options.clock();
            // A refused batch holds no transaction (the table says so): one refused after it had been sent without the network being seen to hold
            // it lets go of the id it was following, since there is nothing on the network to follow.
            const refused = change.state === "broadcast_rejected";
            const broadcastAt = refused
              ? null
              : sentAtAfter(batch.broadcastAt, change, updatedAt);
            const transactionId = refused
              ? null
              : (change.transactionId ?? row.transactionId);
            const failureReason =
              change.failureReason === undefined
                ? row.failureReason
                : change.failureReason;
            const signedPayload = change.signedPayload ?? row.signedPayload;
            const submittedBy = change.submittedBy ?? row.submittedBy;
            await transaction
              .update(referralPayoutBatches)
              .set({
                broadcastAt,
                failureReason,
                signedPayload,
                state: change.state,
                submittedBy,
                transactionId,
                updatedAt,
              })
              .where(eq(referralPayoutBatches.id, id));
            // A batch that ended without paying lets go of its payouts, so the next batch may take them.
            if (unpaid.has(change.state))
              await transaction
                .update(referralPayoutBatchItems)
                .set({ held: false })
                .where(eq(referralPayoutBatchItems.batchId, id));
            return {
              ...batch,
              broadcastAt,
              failureReason,
              signedPayload,
              state: change.state,
              submittedBy,
              transactionId,
              updatedAt,
            };
          }),
  };
}
