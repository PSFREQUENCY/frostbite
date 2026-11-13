import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { authUsers } from "./auth.ts";
import { platformSchema } from "./platform.ts";

// What the platform owes people for taking part, kept as a ledger (ADR-026). A reward PROGRAM is a setting; each setting is a row that is only
// ever added, so the program in force is its newest row and the rows are the history. The kind says how an event earns something (the code
// that does it is a registered kind, never a row), `params` are that kind's own settings (checked against the kind's schema when set), and the
// two settings every program has are here as columns: the least a payout may be and how long an earning waits before it can be paid.
export const rewardProgramSettings = platformSchema.table(
  "reward_program_settings",
  {
    // Staff accounts are not deleted, and the log outlives them if they are.
    changedBy: uuid("changed_by").references(() => authUsers.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    enabled: boolean("enabled").notNull(),
    id: uuid("id").primaryKey(),
    kind: text("kind").notNull(),
    maturitySeconds: integer("maturity_seconds").notNull(),
    minimumPayout: bigint("minimum_payout", { mode: "bigint" }).notNull(),
    params: jsonb("params").notNull(),
    programKey: text("program_key").notNull(),
  },
  (table) => [
    index("reward_program_settings_newest_idx").on(
      table.programKey,
      table.createdAt.desc(),
    ),
    check(
      "reward_program_settings_not_negative",
      sql`${table.maturitySeconds} >= 0 AND ${table.minimumPayout} >= 0`,
    ),
  ],
);

// A request to pay what a person has earned under one program, which a payout executor carries out. The platform decides WHAT is owed and the
// state it is in; HOW it is paid (a staff-signed transaction today) is the executor's, so its steps are not here. `amount` is exactly the sum
// of the entries put in it (checked when it completes). One payout at a time is open per person, program and asset.
export const rewardPayouts = platformSchema.table(
  "reward_payouts",
  {
    amount: bigint("amount", { mode: "bigint" }).notNull(),
    assetKey: text("asset_key").notNull(),
    beneficiaryId: uuid("beneficiary_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "restrict" }),
    completedAt: timestamp("completed_at", {
      mode: "date",
      withTimezone: true,
    }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    destination: text("destination").notNull(),
    executor: text("executor"),
    // What the executor says paid it (a transaction id), once it has one.
    executorRef: text("executor_ref"),
    failureReason: text("failure_reason"),
    id: uuid("id").primaryKey(),
    programKey: text("program_key").notNull(),
    state: text("state").notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("reward_payouts_one_open_idx")
      .on(table.beneficiaryId, table.programKey, table.assetKey)
      .where(sql`${table.state} IN ('requested', 'in_progress')`),
    index("reward_payouts_beneficiary_idx").on(
      table.beneficiaryId,
      table.createdAt.desc(),
    ),
    index("reward_payouts_state_idx")
      .on(table.state, table.createdAt)
      .where(sql`${table.state} IN ('requested', 'in_progress')`),
    check(
      "reward_payouts_state_known",
      sql`${table.state} IN ('requested', 'in_progress', 'complete', 'failed', 'cancelled')`,
    ),
    check("reward_payouts_amount_positive", sql`${table.amount} > 0`),
  ],
);

// One earning, or the reversal of one. A row is never changed except for the single pointer `payout_id` (which payout it was put in, set once
// and cleared if that payout fails), and a trigger holds every other column still. `amount` is signed: an accrual is above zero, a reversal
// below it and names the entry it undoes (once: the unique index), so a repeated event or a repeated reversal writes nothing twice. `source_key`
// is what the kind says the earning is FOR (unique per program), which is what makes a retried event harmless. An entry can be paid from
// `payable_at`; a reversal matures with, or after, the entry it undoes, so the two always net to nothing together.
export const rewardEntries = platformSchema.table(
  "reward_entries",
  {
    amount: bigint("amount", { mode: "bigint" }).notNull(),
    assetKey: text("asset_key").notNull(),
    beneficiaryId: uuid("beneficiary_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    id: uuid("id").primaryKey(),
    kind: text("kind").notNull(),
    occurredAt: timestamp("occurred_at", {
      mode: "date",
      withTimezone: true,
    }).notNull(),
    payableAt: timestamp("payable_at", {
      mode: "date",
      withTimezone: true,
    }).notNull(),
    payoutId: uuid("payout_id").references(() => rewardPayouts.id, {
      onDelete: "restrict",
    }),
    programKey: text("program_key").notNull(),
    reversesEntryId: uuid("reverses_entry_id").references(
      (): AnyPgColumn => rewardEntries.id,
      { onDelete: "restrict" },
    ),
    settingId: uuid("setting_id")
      .notNull()
      .references(() => rewardProgramSettings.id, { onDelete: "restrict" }),
    sourceKey: text("source_key").notNull(),
  },
  (table) => [
    uniqueIndex("reward_entries_source_idx").on(
      table.programKey,
      table.sourceKey,
    ),
    uniqueIndex("reward_entries_reversal_idx")
      .on(table.reversesEntryId)
      .where(sql`${table.reversesEntryId} IS NOT NULL`),
    // What a pot is made of: the entries not yet in a payout, found by when they can be paid, so the part still maturing is a range read of
    // recent rows and never of the whole history.
    index("reward_entries_unpaid_idx")
      .on(
        table.beneficiaryId,
        table.programKey,
        table.assetKey,
        table.payableAt,
      )
      .where(sql`${table.payoutId} IS NULL`),
    index("reward_entries_history_idx").on(
      table.beneficiaryId,
      table.programKey,
      table.createdAt.desc(),
      table.id.desc(),
    ),
    index("reward_entries_payout_idx")
      .on(table.payoutId)
      .where(sql`${table.payoutId} IS NOT NULL`),
    check(
      "reward_entries_kind_and_sign",
      sql`(${table.kind} = 'accrual' AND ${table.amount} > 0 AND ${table.reversesEntryId} IS NULL)
        OR (${table.kind} = 'reversal' AND ${table.amount} < 0 AND ${table.reversesEntryId} IS NOT NULL)`,
    ),
  ],
);

// What each person has under each program and asset, kept by triggers on the two tables above so reading a pot never adds up history:
// `unpaid` (in no payout), `in_flight` (in a payout that is not over), `paid` (in a payout that completed). What is still maturing is read from
// the entries' own index. The three never go below what the entries add up to (a reversal after payment makes `unpaid` negative: a debt that
// the next earnings pay off first).
export const rewardBalances = platformSchema.table(
  "reward_balances",
  {
    assetKey: text("asset_key").notNull(),
    beneficiaryId: uuid("beneficiary_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "restrict" }),
    inFlight: bigint("in_flight", { mode: "bigint" }).notNull().default(0n),
    paid: bigint("paid", { mode: "bigint" }).notNull().default(0n),
    programKey: text("program_key").notNull(),
    unpaid: bigint("unpaid", { mode: "bigint" }).notNull().default(0n),
  },
  (table) => [
    uniqueIndex("reward_balances_key_idx").on(
      table.beneficiaryId,
      table.programKey,
      table.assetKey,
    ),
  ],
);

// Every move of a payout, only ever added: from where to where, who (a staff account, or none for the platform itself) and why.
export const rewardPayoutTransitions = platformSchema.table(
  "reward_payout_transitions",
  {
    actorId: uuid("actor_id").references(() => authUsers.id, {
      onDelete: "set null",
    }),
    at: timestamp("at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    fromState: text("from_state"),
    id: uuid("id").primaryKey(),
    payoutId: uuid("payout_id")
      .notNull()
      .references(() => rewardPayouts.id, { onDelete: "restrict" }),
    reason: text("reason"),
    toState: text("to_state").notNull(),
  },
  (table) => [
    index("reward_payout_transitions_payout_idx").on(table.payoutId, table.at),
  ],
);
