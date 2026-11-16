import type { DatabaseClient } from "@frostbite/database/connection";
import {
  rewardBalances,
  rewardEntries,
} from "@frostbite/database/schema/rewards";
import { and, eq, gt, isNull, lt, or, sql } from "drizzle-orm";

import { onlyRow } from "./rows.ts";
import type { Balance, BalanceKey, Entry, Page } from "./types.ts";

export interface BalancesDependencies {
  readonly clock: () => Date;
  readonly database: DatabaseClient;
}

type Row = typeof rewardEntries.$inferSelect;

const toEntry = (row: Row): Entry => ({
  amount: row.amount,
  assetKey: row.assetKey,
  beneficiaryId: row.beneficiaryId,
  createdAt: row.createdAt,
  id: row.id,
  // The table's own check allows only these two.
  kind: row.kind as Entry["kind"],
  occurredAt: row.occurredAt,
  payableAt: row.payableAt,
  payoutId: row.payoutId,
  programKey: row.programKey,
  sourceKey: row.sourceKey,
});

const defaultPageSize = 50;
const largestPageSize = 200;

interface Cursor {
  readonly createdAt: Date;
  readonly id: string;
}

// The two reads that could grow with the history, as queries a test can ask the database to explain: what is still maturing (a range of the
// unpaid index, so only the recent entries), and a page of entries (the history index, with no sort).
export function balanceQueries(database: DatabaseClient) {
  return {
    history: (
      beneficiaryId: string,
      programKey: string,
      cursor: Cursor | null,
      limit: number,
    ) =>
      database
        .select()
        .from(rewardEntries)
        .where(
          and(
            eq(rewardEntries.beneficiaryId, beneficiaryId),
            eq(rewardEntries.programKey, programKey),
            cursor === null
              ? undefined
              : or(
                  lt(rewardEntries.createdAt, cursor.createdAt),
                  and(
                    eq(rewardEntries.createdAt, cursor.createdAt),
                    lt(rewardEntries.id, cursor.id),
                  ),
                ),
          ),
        )
        .orderBy(
          sql`${rewardEntries.createdAt} desc nulls last, ${rewardEntries.id} desc nulls last`,
        )
        .limit(limit),
    maturing: (key: BalanceKey, now: Date) =>
      database
        .select({
          total: sql<string>`coalesce(sum(${rewardEntries.amount}), 0)::text`,
        })
        .from(rewardEntries)
        .where(
          and(
            eq(rewardEntries.beneficiaryId, key.beneficiaryId),
            eq(rewardEntries.programKey, key.programKey),
            eq(rewardEntries.assetKey, key.assetKey),
            isNull(rewardEntries.payoutId),
            gt(rewardEntries.payableAt, now),
          ),
        ),
  };
}

// Reading what a person has: the pot, and the entries behind it. Nothing here adds up the whole history: the three totals are rows kept by
// triggers, and what is still maturing is a read of the few entries whose time has not come, found by their index.
export function createBalances(dependencies: BalancesDependencies) {
  const { clock, database } = dependencies;
  const queries = balanceQueries(database);

  return {
    // The pot of a person under a program and asset, as of now. `payable` is what a payout could take (`unpaid` less what is maturing).
    async balance(key: BalanceKey): Promise<Balance> {
      const [totals] = await database
        .select()
        .from(rewardBalances)
        .where(
          and(
            eq(rewardBalances.beneficiaryId, key.beneficiaryId),
            eq(rewardBalances.programKey, key.programKey),
            eq(rewardBalances.assetKey, key.assetKey),
          ),
        );
      // A sum always has a row, even over nothing.
      const maturing = onlyRow(
        await queries.maturing(key, clock()),
        "sum of what is maturing",
      );
      const unpaid = totals?.unpaid ?? 0n;
      const stillMaturing = BigInt(maturing.total);
      return {
        inFlight: totals?.inFlight ?? 0n,
        maturing: stillMaturing,
        paid: totals?.paid ?? 0n,
        payable: unpaid - stillMaturing,
      };
    },

    // A person's entries under a program, newest first, a page at a time. `after` is the `next` of the page before.
    async entries(
      beneficiaryId: string,
      programKey: string,
      options: { readonly after?: string | null; readonly limit?: number } = {},
    ): Promise<Page<Entry>> {
      const limit = Math.min(
        Math.max(options.limit ?? defaultPageSize, 1),
        largestPageSize,
      );
      const cursor = parseCursor(options.after ?? null);
      const rows = await queries.history(
        beneficiaryId,
        programKey,
        cursor,
        limit + 1,
      );
      const items = rows.slice(0, limit).map(toEntry);
      const last = items.at(-1);
      return {
        items,
        next:
          rows.length > limit && last !== undefined
            ? `${last.createdAt.toISOString()}|${last.id}`
            : null,
      };
    },
  };
}

export function parseCursor(value: string | null): Cursor | null {
  if (value === null) return null;
  const parts = value.split("|");
  const createdAt = new Date(String(parts[0]));
  if (parts.length !== 2 || Number.isNaN(createdAt.getTime()))
    throw new TypeError("That is not a page cursor of the ledger.");
  return { createdAt, id: String(parts[1]) };
}
