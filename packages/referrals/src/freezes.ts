import type { DatabaseClient } from "@frostbite/database/connection";
import { referralFreezes } from "@frostbite/database/schema/referrals";
import { eq, sql } from "drizzle-orm";

export interface FreezesDependencies {
  readonly clock: () => Date;
  readonly database: DatabaseClient;
  readonly newId: () => string;
}

export interface Freeze {
  readonly changedBy: string | null;
  readonly createdAt: Date;
  readonly frozen: boolean;
  readonly reason: string;
  readonly referrerId: string;
}

// Newest first, ties by id, spelled as the index is made (a Postgres `desc` alone sorts nulls first and would not use it).
const newestFirst = sql`${referralFreezes.createdAt} desc nulls last, ${referralFreezes.id} desc nulls last`;
const longestReason = 500;
const defaultHistory = 50;
const mostHistory = 200;

export type SetFrozenResult =
  | { readonly freeze: Freeze; readonly ok: true }
  | {
      readonly code: "reason-required" | "reason-too-long";
      readonly ok: false;
    };

// Whether a referrer is earning, as a log: a freeze and an unfreeze are rows added with a reason, and the newest is in force. Nothing earned
// is taken back by a freeze, and nothing is earned during one (the referral kind reads it with each claim).
export function createFreezes(dependencies: FreezesDependencies) {
  const { clock, database, newId } = dependencies;
  return {
    async history(referrerId: string, limit = defaultHistory) {
      const rows = await database
        .select()
        .from(referralFreezes)
        .where(eq(referralFreezes.referrerId, referrerId))
        .orderBy(newestFirst)
        .limit(Math.min(Math.max(limit, 1), mostHistory));
      return rows.map(
        ({
          changedBy,
          createdAt,
          frozen,
          reason,
          referrerId: who,
        }): Freeze => ({
          changedBy,
          createdAt,
          frozen,
          reason,
          referrerId: who,
        }),
      );
    },

    // The state in force: the newest row, one read of the index. A person never frozen is not frozen.
    async isFrozen(referrerId: string): Promise<boolean> {
      const [newest] = await database
        .select({ frozen: referralFreezes.frozen })
        .from(referralFreezes)
        .where(eq(referralFreezes.referrerId, referrerId))
        .orderBy(newestFirst)
        .limit(1);
      return newest?.frozen ?? false;
    },

    // Freezes or unfreezes a referrer, with the reason kept. The caller has checked that the actor may.
    async set(
      actorId: string,
      referrerId: string,
      frozen: boolean,
      reason: string,
    ): Promise<SetFrozenResult> {
      const trimmed = reason.trim();
      if (trimmed === "") return { code: "reason-required", ok: false };
      if (trimmed.length > longestReason)
        return { code: "reason-too-long", ok: false };
      const [row] = await database
        .insert(referralFreezes)
        .values({
          changedBy: actorId,
          createdAt: clock(),
          frozen,
          id: newId(),
          reason: trimmed,
          referrerId,
        })
        .returning();
      if (row === undefined) throw new Error("A freeze was not recorded.");
      return {
        freeze: {
          changedBy: row.changedBy,
          createdAt: row.createdAt,
          frozen: row.frozen,
          reason: row.reason,
          referrerId: row.referrerId,
        },
        ok: true,
      };
    },
  };
}

export type Freezes = ReturnType<typeof createFreezes>;
