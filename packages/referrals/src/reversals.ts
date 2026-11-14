import type { DatabaseClient } from "@frostbite/database/connection";
import { authUsers } from "@frostbite/database/schema/auth";
import { referralReversals } from "@frostbite/database/schema/referrals";
import { rewardEntries } from "@frostbite/database/schema/rewards";
import type { Rewards } from "@frostbite/rewards";
import {
  reversalEffectOf,
  type ReversalEffect,
} from "@frostbite/shared/referrals";
import { and, eq, inArray, or } from "drizzle-orm";

import { earningStateOf } from "./earnings.ts";
import { referralProgramKey } from "./kind.ts";
import { uuidPattern } from "./referrers.ts";

// Taking an earning back (REF-1f). What it does to the money is stated once, in `@frostbite/shared/referrals` (`reversalEffectOf`), for the page
// that warns before and for the answer given after.

export interface TakenBack {
  readonly at: Date;
  // Who did it; none when that account is gone.
  readonly by: string | null;
  readonly reason: string;
}

export type TakeBackResult =
  | { readonly effect: ReversalEffect; readonly ok: true }
  | {
      readonly code:
        | "already-taken-back"
        | "not-found"
        | "reason-required"
        | "reason-too-long";
      readonly ok: false;
    };

const longestReason = 500;

export function createReversals(dependencies: {
  readonly clock: () => Date;
  readonly database: DatabaseClient;
  readonly rewards: Pick<Rewards, "accrual" | "payouts">;
}) {
  const { clock, database, rewards } = dependencies;

  // What taking this earning back would do, from where it stands now.
  async function effectOf(entry: {
    readonly payableAt: Date;
    readonly payoutId: string | null;
  }): Promise<ReversalEffect> {
    const payoutState =
      entry.payoutId === null
        ? undefined
        : (await rewards.payouts.statesOf([entry.payoutId])).get(
            entry.payoutId,
          );
    const state = earningStateOf(
      { kind: "accrual", payableAt: entry.payableAt, payoutId: entry.payoutId },
      payoutState,
      clock(),
    );
    // An accrual is never in the state of a reversal.
    if (state === "reversal") throw new Error("An earning was expected.");
    return reversalEffectOf(state);
  }

  // The earning as the ledger holds it, if it is one of the referral program's (and not itself a reversal).
  async function earning(earningId: string) {
    if (!uuidPattern.test(earningId)) return null;
    const [row] = await database
      .select()
      .from(rewardEntries)
      .where(
        and(
          eq(rewardEntries.id, earningId),
          eq(rewardEntries.programKey, referralProgramKey),
          eq(rewardEntries.kind, "accrual"),
        ),
      );
    return row ?? null;
  }

  return {
    // Takes an earning back, as the actor, with the reason kept. The ledger writes the opposite entry once; the reason and who are written in
    // the same transaction, so the one exists exactly when the other does. The caller has checked that the actor may.
    async takeBack(
      actorId: string,
      earningId: string,
      reason: string,
    ): Promise<TakeBackResult> {
      const trimmed = reason.trim();
      if (trimmed === "") return { code: "reason-required", ok: false };
      if (trimmed.length > longestReason)
        return { code: "reason-too-long", ok: false };
      const row = await earning(earningId);
      if (row === null) return { code: "not-found", ok: false };
      const effect = await effectOf(row);
      const result = await rewards.accrual.reverse({
        programKey: row.programKey,
        sourceKey: row.sourceKey,
        within: async (transaction, written) => {
          await transaction.insert(referralReversals).values({
            changedBy: actorId,
            createdAt: clock(),
            earningId: written.earningId,
            reason: trimmed,
            reversalId: written.reversalId,
          });
        },
      });
      return result.kind === "reversed"
        ? { effect, ok: true }
        : {
            code:
              result.kind === "already-reversed"
                ? "already-taken-back"
                : "not-found",
            ok: false,
          };
    },

    // For a page of entries, which were taken back and why. An earning and the entry that undid it are both found by either id, so each row of
    // a page says it.
    async takenBack(
      entryIds: readonly string[],
    ): Promise<ReadonlyMap<string, TakenBack>> {
      const known = entryIds.filter((id) => uuidPattern.test(id));
      if (known.length === 0) return new Map();
      const rows = await database
        .select({
          at: referralReversals.createdAt,
          by: authUsers.name,
          earningId: referralReversals.earningId,
          reason: referralReversals.reason,
          reversalId: referralReversals.reversalId,
        })
        .from(referralReversals)
        .leftJoin(authUsers, eq(authUsers.id, referralReversals.changedBy))
        .where(
          or(
            inArray(referralReversals.earningId, known),
            inArray(referralReversals.reversalId, known),
          ),
        );
      return new Map(
        rows.flatMap(({ at, by, earningId, reason, reversalId }) => {
          const said: TakenBack = { at, by, reason };
          return [
            [earningId, said],
            [reversalId, said],
          ] as const;
        }),
      );
    },
  };
}

export type Reversals = ReturnType<typeof createReversals>;
