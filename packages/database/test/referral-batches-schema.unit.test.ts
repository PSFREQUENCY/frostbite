import { getTableName } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import {
  referralPayoutBatchItems,
  referralPayoutBatches,
} from "../src/index.ts";

const indexes = (table: Parameters<typeof getTableConfig>[0]) =>
  getTableConfig(table).indexes.map(({ config }) => [
    config.name,
    config.unique,
    config.where !== undefined,
  ]);
const references = (table: Parameters<typeof getTableConfig>[0]) =>
  getTableConfig(table).foreignKeys.map((key) => [
    getTableName(key.reference().foreignTable),
    key.onDelete,
  ]);

describe("the batches staff pay referrers with", () => {
  it("allow one batch in progress per asset, are found newest first, keep their people when an account goes, and act on no contract", () => {
    expect(getTableName(referralPayoutBatches)).toBe("referral_payout_batches");
    expect(indexes(referralPayoutBatches)).toEqual(
      expect.arrayContaining([
        ["referral_payout_batches_one_in_progress_idx", true, true],
        ["referral_payout_batches_newest_idx", false, false],
      ]),
    );
    expect(references(referralPayoutBatches)).toEqual([
      ["auth_users", "set null"],
      ["auth_users", "set null"],
    ]);
    expect(
      getTableConfig(referralPayoutBatches).checks.map(({ name }) => name),
    ).toContain("referral_payout_batches_no_contract");
  });

  it("hold a payout in one batch at a time and refuse to lose a batch or a payout that is recorded", () => {
    expect(indexes(referralPayoutBatchItems)).toEqual([
      ["referral_payout_batch_items_batch_payout_idx", true, false],
      ["referral_payout_batch_items_held_idx", true, true],
    ]);
    expect(references(referralPayoutBatchItems)).toEqual([
      ["referral_payout_batches", "restrict"],
      ["reward_payouts", "restrict"],
    ]);
  });
});
