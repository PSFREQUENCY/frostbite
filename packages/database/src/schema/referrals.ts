import { referralCodePattern } from "@frostbite/shared/referrals";
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { authUsers } from "./auth.ts";
import { platformSchema } from "./platform.ts";

// Who brought whom (ADR-026). A person has at most one referral CODE, made the first time it is needed; it is opaque and says nothing of the
// account. The shape of a code is stated once in `@frostbite/shared/referrals`, and the table holds only codes of that shape.
export const referralCodes = platformSchema.table(
  "referral_codes",
  {
    code: text("code").notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    userId: uuid("user_id")
      .primaryKey()
      .references(() => authUsers.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("referral_codes_code_unique").on(table.code),
    check(
      "referral_codes_code_shape",
      sql`${table.code} ~ ${sql.raw(`'${referralCodePattern.source}'`)}`,
    ),
  ],
);

// The one link of an account to the person who referred it, made when the account was created and never changed or removed (an account
// has one primary key, so it has one referrer, once). A person cannot be their own referrer.
export const referralLinks = platformSchema.table(
  "referral_links",
  {
    // The code the person arrived with, kept as it was then.
    code: text("code").notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    referredUserId: uuid("referred_user_id")
      .primaryKey()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    referrerId: uuid("referrer_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("referral_links_referrer_idx").on(table.referrerId, table.createdAt),
    check(
      "referral_links_not_self",
      sql`${table.referredUserId} <> ${table.referrerId}`,
    ),
  ],
);

// Whether a referrer is earning, as a log: each row freezes or unfreezes one person and says why, and the newest row is the state in force.
// Nothing is updated or deleted, so the log is also who stopped whom and when.
export const referralFreezes = platformSchema.table(
  "referral_freezes",
  {
    changedBy: uuid("changed_by").references(() => authUsers.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    frozen: boolean("frozen").notNull(),
    id: uuid("id").primaryKey(),
    reason: text("reason").notNull(),
    referrerId: uuid("referrer_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("referral_freezes_newest_idx").on(
      table.referrerId,
      table.createdAt.desc(),
    ),
    check(
      "referral_freezes_reason_length",
      sql`char_length(${table.reason}) between 1 and 500`,
    ),
  ],
);
