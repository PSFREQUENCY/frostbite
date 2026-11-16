import type { DatabaseClient } from "@frostbite/database/connection";
import { rewardProgramSettings } from "@frostbite/database/schema/rewards";
import type { JsonValue } from "@frostbite/shared/chain";
import { eq, sql } from "drizzle-orm";

import type { KindRegistry } from "./kinds.ts";
import { onlyRow } from "./rows.ts";
import type { ProgramSetting } from "./types.ts";

// The ceilings an admin cannot set a program past, a guard against a slip of the keyboard. They are policy, not code: the platform gives them.
export interface RewardsPolicy {
  // The longest an earning may be made to wait before it can be paid.
  readonly maximumMaturitySeconds: number;
  // The most the minimum payout of a program may be set to, in base units.
  readonly maximumMinimumPayout: bigint;
}

export interface ProgramInput {
  readonly enabled: boolean;
  readonly kind: string;
  readonly maturitySeconds: number;
  readonly minimumPayout: bigint;
  readonly params: JsonValue;
}

export type SetProgramResult =
  | { readonly ok: true; readonly setting: ProgramSetting }
  | {
      readonly code:
        | "above-maximum"
        | "invalid-key"
        | "invalid-params"
        | "kind-changed"
        | "negative"
        | "unknown-kind";
      // What was wrong with the kind's own settings, for `invalid-params`.
      readonly issues?: readonly string[];
      readonly ok: false;
    };

export interface ProgramsDependencies {
  readonly clock: () => Date;
  readonly database: DatabaseClient;
  readonly newId: () => string;
  readonly policy: RewardsPolicy;
  readonly registry: KindRegistry;
}

export const programKeyPattern = /^[a-z0-9][a-z0-9-]{0,63}$/u;

type Row = typeof rewardProgramSettings.$inferSelect;

const toSetting = (row: Row): ProgramSetting => ({
  changedAt: row.createdAt,
  changedBy: row.changedBy,
  enabled: row.enabled,
  id: row.id,
  kind: row.kind,
  maturitySeconds: row.maturitySeconds,
  minimumPayout: row.minimumPayout,
  // The column holds what `checkParams` accepted when it was written.
  params: row.params as JsonValue,
  programKey: row.programKey,
});

// The settings of the platform's programs: what an admin sets, and what the rest of the platform reads. Every setting is a row that is only
// ever added, so the program in force is its newest row and the rows are the history.
export function createPrograms(dependencies: ProgramsDependencies) {
  const { clock, database, newId, policy, registry } = dependencies;

  async function inForce(programKey: string): Promise<ProgramSetting | null> {
    const [row] = await database
      .select()
      .from(rewardProgramSettings)
      .where(eq(rewardProgramSettings.programKey, programKey))
      .orderBy(
        sql`${rewardProgramSettings.createdAt} desc nulls last, ${rewardProgramSettings.id} desc`,
      )
      .limit(1);
    return row === undefined ? null : toSetting(row);
  }

  return {
    // The newest setting of every program that has one.
    async allInForce(): Promise<readonly ProgramSetting[]> {
      const rows = await database
        .selectDistinctOn([rewardProgramSettings.programKey])
        .from(rewardProgramSettings)
        .orderBy(
          rewardProgramSettings.programKey,
          sql`${rewardProgramSettings.createdAt} desc nulls last, ${rewardProgramSettings.id} desc`,
        );
      return rows.map(toSetting);
    },

    // A program's settings, newest first: who set what, and when.
    async history(
      programKey: string,
      limit = 50,
    ): Promise<readonly ProgramSetting[]> {
      const rows = await database
        .select()
        .from(rewardProgramSettings)
        .where(eq(rewardProgramSettings.programKey, programKey))
        .orderBy(
          sql`${rewardProgramSettings.createdAt} desc nulls last, ${rewardProgramSettings.id} desc`,
        )
        .limit(limit);
      return rows.map(toSetting);
    },

    inForce,

    // Sets a program: adds a row. Refused for a key that is not a key, a kind the platform does not have, a different kind than the program
    // already is (earnings made under one kind must never be read as another), settings the kind does not accept, a negative number, or a
    // number past the ceilings of policy.
    async setProgram(
      actorId: string | null,
      programKey: string,
      input: ProgramInput,
    ): Promise<SetProgramResult> {
      if (!programKeyPattern.test(programKey))
        return { code: "invalid-key", ok: false };
      const kind = registry.get(input.kind);
      if (kind === undefined) return { code: "unknown-kind", ok: false };
      if (
        input.minimumPayout < 0n ||
        input.maturitySeconds < 0 ||
        !Number.isInteger(input.maturitySeconds)
      )
        return { code: "negative", ok: false };
      if (
        input.minimumPayout > policy.maximumMinimumPayout ||
        input.maturitySeconds > policy.maximumMaturitySeconds
      )
        return { code: "above-maximum", ok: false };
      const checked = kind.checkParams(input.params);
      if (!checked.ok)
        return { code: "invalid-params", issues: checked.issues, ok: false };
      return database.transaction(async (transaction) => {
        // One change at a time per program, so the kind cannot be switched by two at once.
        await transaction.execute(
          sql`select pg_advisory_xact_lock(hashtextextended(${`rewards-program:${programKey}`}, 0))`,
        );
        const [newest] = await transaction
          .select({ kind: rewardProgramSettings.kind })
          .from(rewardProgramSettings)
          .where(eq(rewardProgramSettings.programKey, programKey))
          .limit(1);
        if (newest !== undefined && newest.kind !== input.kind)
          return { code: "kind-changed", ok: false } as const;
        const row = onlyRow(
          await transaction
            .insert(rewardProgramSettings)
            .values({
              changedBy: actorId,
              createdAt: clock(),
              enabled: input.enabled,
              id: newId(),
              kind: input.kind,
              maturitySeconds: input.maturitySeconds,
              minimumPayout: input.minimumPayout,
              params: checked.params,
              programKey,
            })
            .returning(),
          "setting",
        );
        return { ok: true, setting: toSetting(row) } as const;
      });
    },
  };
}

export type Programs = ReturnType<typeof createPrograms>;
