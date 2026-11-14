import { maxAdminPayloadChars } from "@frostbite/shared/games";
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { authUsers } from "./auth.ts";
import { platformSchema } from "./platform.ts";
import { rewardPayouts } from "./rewards.ts";
import {
  settledStatesSql,
  trackedTransactionChecks,
  trackedTransactionColumns,
} from "./tracked-transaction.ts";

// A batch staff pay referrers with (ADR-026): one transaction that pays every payout in it, with who built it, who sent it signed, the
// transaction built and the summary they were shown, and where it is in the chain's lifecycle. It is also the audit of payouts, so rows
// are never deleted and the people stay recorded after their accounts are gone. One batch per asset is in progress at a time.
export const referralPayoutBatches = platformSchema.table(
  "referral_payout_batches",
  {
    id: uuid("id").primaryKey(),
    // What the batch pays, as the ledger's asset key.
    assetKey: text("asset_key").notNull(),
    createdBy: uuid("created_by").references(() => authUsers.id, {
      onDelete: "set null",
    }),
    submittedBy: uuid("submitted_by").references(() => authUsers.id, {
      onDelete: "set null",
    }),
    ...trackedTransactionColumns,
    // A batch acts on no contract.
    contractFamily: text("contract_family"),
    contractId: text("contract_id"),
  },
  (table) => [
    uniqueIndex("referral_payout_batches_one_in_progress_idx")
      .on(table.assetKey)
      .where(sql`${table.state} not in (${settledStatesSql})`),
    index("referral_payout_batches_newest_idx").on(table.createdAt.desc()),
    check(
      "referral_payout_batches_no_contract",
      sql`${table.contractFamily} is null and ${table.contractId} is null`,
    ),
    ...trackedTransactionChecks(
      "referral_payout_batches",
      table,
      maxAdminPayloadChars,
    ),
  ],
);

// Which payouts a batch pays. A payout is in one batch at a time: a batch that ends without paying lets go of its payouts (they are
// requested again, waiting for the next), so the unique index holds only for a batch that has not let go.
export const referralPayoutBatchItems = platformSchema.table(
  "referral_payout_batch_items",
  {
    batchId: uuid("batch_id")
      .notNull()
      .references(() => referralPayoutBatches.id, { onDelete: "restrict" }),
    // Whether the batch still holds the payout.
    held: boolean("held").notNull().default(true),
    payoutId: uuid("payout_id")
      .notNull()
      .references(() => rewardPayouts.id, { onDelete: "restrict" }),
  },
  (table) => [
    uniqueIndex("referral_payout_batch_items_batch_payout_idx").on(
      table.batchId,
      table.payoutId,
    ),
    uniqueIndex("referral_payout_batch_items_held_idx")
      .on(table.payoutId)
      .where(sql`${table.held}`),
  ],
);
