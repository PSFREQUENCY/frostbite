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

  it("puts the program in the admin navigation only for those who may open it, and the public page in the main one", () => {
    expect(
      feature().manifest.navigation.map(({ access, area, href }) => [
        area,
        href,
        access.kind === "platform" ? access.capability : access.kind,
      ]),
    ).toEqual([
      ["main", "/referrals", "public"],
      ["admin", "/admin/referrals", "referral:view"],
      ["admin", "/admin/referrals/program", "referral:administer"],
    ]);
  });
});
