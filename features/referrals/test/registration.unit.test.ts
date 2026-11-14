import { describe, expect, it } from "vitest";

import { createReferralsFeature } from "../src/registration.ts";

const feature = () =>
  createReferralsFeature({
    policy: { maximumMaturitySeconds: 60, maximumMinimumPayout: 1n },
  });

describe("the referral feature's registration", () => {
  it("declares the routes, the pages and the navigation, so that removing it removes them all", () => {
    const { manifest } = feature();
    expect(manifest.id).toBe("referrals");
    expect(manifest.dependencies).toEqual(["accounts", "games"]);
    expect(manifest.routes.map(({ operationId }) => operationId)).toEqual([
      "setReferralProgram",
      "setReferrerFrozen",
    ]);
    expect(
      manifest.pages.map(({ access, path }) => [
        path,
        access.kind === "platform" ? access.capability : access.kind,
      ]),
    ).toEqual([
      ["/referrals", "public"],
      ["/referrals/history", "authenticated"],
      ["/admin/referrals", "referral:view"],
      ["/admin/referrals/program", "referral:administer"],
      ["/admin/referrals/referrers", "referral:view"],
      ["/admin/referrals/referrers/[referrerId]", "referral:view"],
    ]);
  });

  it("puts the overview in the admin navigation for staff, the program only for those who may open it, and nothing in the bar every visitor sees or in the account menu (the wallet menu links the page itself)", () => {
    expect(
      feature().manifest.navigation.map(({ access, area, href }) => [
        area,
        href,
        access.kind === "platform" ? access.capability : access.kind,
      ]),
    ).toEqual([
      ["admin", "/admin/referrals", "referral:view"],
      ["admin", "/admin/referrals/program", "referral:administer"],
    ]);
  });
});
