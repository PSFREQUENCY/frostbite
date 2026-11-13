import { getTableName } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import {
  rewardBalances,
  rewardEntries,
  rewardPayoutTransitions,
  rewardPayouts,
  rewardProgramSettings,
} from "../src/index.ts";

const names = (items: readonly { readonly name: string }[]) =>
  items.map(({ name }) => name);
const indexes = (table: Parameters<typeof getTableConfig>[0]) =>
  getTableConfig(table).indexes.map(({ config }) => [
    config.name,
    config.unique,
    config.where !== undefined,
  ]);
const forwardKeys = (table: Parameters<typeof getTableConfig>[0]) =>
  getTableConfig(table).foreignKeys.map((key) => [
    getTableName(key.reference().foreignTable),
    key.onDelete,
  ]);

describe("the log of reward program settings", () => {
  it("only grows, finds the newest setting of a program by an index, and survives the account that set it", () => {
    const config = getTableConfig(rewardProgramSettings);
    expect(indexes(rewardProgramSettings)).toEqual([
      ["reward_program_settings_newest_idx", false, false],
    ]);
    expect(names(config.checks)).toEqual([
      "reward_program_settings_not_negative",
    ]);
    expect(forwardKeys(rewardProgramSettings)).toEqual([
      ["auth_users", "set null"],
    ]);
  });
});

describe("the ledger of entries", () => {
  it("is unique by what an earning is for, undoes an earning once, and finds what is unpaid by an index of the unpaid only", () => {
    expect(indexes(rewardEntries)).toEqual([
      ["reward_entries_source_idx", true, false],
      ["reward_entries_reversal_idx", true, true],
      ["reward_entries_unpaid_idx", false, true],
      ["reward_entries_history_idx", false, false],
      ["reward_entries_payout_idx", false, true],
    ]);
  });

  it("holds the sign of an entry to what it is, and never lets the account, the setting or the payout behind it be deleted", () => {
    expect(names(getTableConfig(rewardEntries).checks)).toEqual([
      "reward_entries_kind_and_sign",
    ]);
    expect(forwardKeys(rewardEntries)).toEqual([
      ["auth_users", "restrict"],
      ["reward_payouts", "restrict"],
      ["reward_entries", "restrict"],
      ["reward_program_settings", "restrict"],
    ]);
  });
});

describe("the pots", () => {
  it("are one row per person, program and asset, and never outlive their account silently", () => {
    expect(indexes(rewardBalances)).toEqual([
      ["reward_balances_key_idx", true, false],
    ]);
    expect(forwardKeys(rewardBalances)).toEqual([["auth_users", "restrict"]]);
    const columns = getTableConfig(rewardBalances).columns;
    expect(
      columns
        .filter(({ name }) => ["unpaid", "in_flight", "paid"].includes(name))
        .every(({ notNull, default: value }) => notNull && value === 0n),
    ).toBe(true);
  });
});

describe("the payouts", () => {
  it("allow one open payout at a time per person, program and asset, and only the known states and positive amounts", () => {
    expect(indexes(rewardPayouts)).toEqual([
      ["reward_payouts_one_open_idx", true, true],
      ["reward_payouts_beneficiary_idx", false, false],
      ["reward_payouts_state_idx", false, true],
    ]);
    expect(names(getTableConfig(rewardPayouts).checks)).toEqual([
      "reward_payouts_state_known",
      "reward_payouts_amount_positive",
    ]);
    expect(forwardKeys(rewardPayouts)).toEqual([["auth_users", "restrict"]]);
  });

  it("keep their audit of moves, which no payout deletion can take away", () => {
    expect(forwardKeys(rewardPayoutTransitions)).toEqual([
      ["auth_users", "set null"],
      ["reward_payouts", "restrict"],
    ]);
    expect(indexes(rewardPayoutTransitions)).toEqual([
      ["reward_payout_transitions_payout_idx", false, false],
    ]);
  });
});
