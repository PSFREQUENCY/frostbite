import { getTableName } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import { referralCodes, referralFreezes, referralLinks } from "../src/index.ts";

const names = (items: readonly { readonly name: string }[]) =>
  items.map(({ name }) => name);
const forwardKeys = (table: Parameters<typeof getTableConfig>[0]) =>
  getTableConfig(table).foreignKeys.map((key) => [
    getTableName(key.reference().foreignTable),
    key.onDelete,
  ]);

describe("the referral tables", () => {
  it("give a person one code, unique among all, of the shape of a code", () => {
    expect(getTableConfig(referralCodes).primaryKeys).toEqual([]);
    expect(
      getTableConfig(referralCodes).indexes.map(({ config }) => [
        config.name,
        config.unique,
      ]),
    ).toEqual([["referral_codes_code_unique", true]]);
    expect(names(getTableConfig(referralCodes).checks)).toEqual([
      "referral_codes_code_shape",
    ]);
    expect(forwardKeys(referralCodes)).toEqual([["auth_users", "cascade"]]);
  });

  it("give an account one referrer, never itself, found from the referrer by an index", () => {
    expect(names(getTableConfig(referralLinks).checks)).toEqual([
      "referral_links_not_self",
    ]);
    expect(
      getTableConfig(referralLinks).indexes.map(({ config }) => config.name),
    ).toEqual(["referral_links_referrer_idx"]);
    expect(forwardKeys(referralLinks)).toEqual([
      ["auth_users", "cascade"],
      ["auth_users", "cascade"],
    ]);
  });

  it("keep freezes as a log that outlives who made them, found newest first by an index, each with a reason of a sensible length", () => {
    expect(names(getTableConfig(referralFreezes).checks)).toEqual([
      "referral_freezes_reason_length",
    ]);
    expect(
      getTableConfig(referralFreezes).indexes.map(({ config }) => config.name),
    ).toEqual(["referral_freezes_newest_idx"]);
    expect(forwardKeys(referralFreezes)).toEqual([
      ["auth_users", "set null"],
      ["auth_users", "cascade"],
    ]);
  });
});
