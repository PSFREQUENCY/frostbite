import { describe, expect, it } from "vitest";

import {
  referralAdminRoutes,
  referralsAdminReferrerHref,
  setReferralProgramInputSchema,
  setReferrerFrozenInputSchema,
} from "../src/referrals/pages.ts";

const program = {
  enabled: true,
  maturitySeconds: 3_600,
  minimumPayoutUnits: "10000",
  rateBasisPoints: 300,
};

describe("setting the referral program", () => {
  it("takes every setting together, with amounts in digits", () => {
    expect(setReferralProgramInputSchema.parse(program)).toEqual(program);
  });

  it("refuses a rate outside 0.01% to 99.99%, an amount that is not whole digits, a negative wait and any setting not named", () => {
    for (const bad of [
      { ...program, rateBasisPoints: 0 },
      { ...program, rateBasisPoints: 10_000 },
      { ...program, rateBasisPoints: 1.5 },
      { ...program, minimumPayoutUnits: "-1" },
      { ...program, minimumPayoutUnits: "1.5" },
      { ...program, minimumPayoutUnits: "007" },
      { ...program, maturitySeconds: -1 },
      { ...program, cap: 5 },
    ])
      expect(setReferralProgramInputSchema.safeParse(bad).success).toBe(false);
  });
});

describe("freezing a referrer", () => {
  const frozen = {
    frozen: true,
    reason: "  Looked into it.  ",
    referrerId: "0198a5c4-7b3e-7c1a-8f2d-4e5b6a7c8d9e",
  };
  it("takes a person and a reason, trimmed", () => {
    expect(setReferrerFrozenInputSchema.parse(frozen).reason).toBe(
      "Looked into it.",
    );
  });
  it("refuses a missing, blank or over-long reason and a person who is not an id", () => {
    for (const bad of [
      { ...frozen, reason: "" },
      { ...frozen, reason: "   " },
      { ...frozen, reason: "x".repeat(501) },
      { ...frozen, referrerId: "someone" },
    ])
      expect(setReferrerFrozenInputSchema.safeParse(bad).success).toBe(false);
  });
});

describe("the routes", () => {
  it("are posts under the referral program's own address, and a referrer's page is under the list", () => {
    expect(referralAdminRoutes.setProgram.method).toBe("POST");
    expect(referralAdminRoutes.setFrozen.method).toBe("POST");
    expect(referralsAdminReferrerHref("abc")).toBe(
      "/admin/referrals/referrers/abc",
    );
  });
});
