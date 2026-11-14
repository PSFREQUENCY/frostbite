import { getTableName } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import { referralReversals } from "../src/index.ts";

describe("the record of earnings taken back", () => {
  it("has one row per earning and per reversal, keeps the ledger entries it explains, survives the account that did it, and bounds the reason", () => {
    const config = getTableConfig(referralReversals);
    expect(getTableName(referralReversals)).toBe("referral_reversals");
    expect(
      config.indexes.map(({ config: index }) => [index.name, index.unique]),
    ).toEqual([["referral_reversals_reversal_idx", true]]);
    expect(
      config.foreignKeys.map((key) => [
        getTableName(key.reference().foreignTable),
        key.onDelete,
      ]),
    ).toEqual([
      ["auth_users", "set null"],
      ["reward_entries", "restrict"],
      ["reward_entries", "restrict"],
    ]);
    expect(config.checks.map(({ name }) => name)).toEqual([
      "referral_reversals_reason_length",
    ]);
    expect(config.columns.find(({ primary }) => primary)?.name).toBe(
      "earning_id",
    );
  });
});
