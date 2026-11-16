import { describe, expect, it } from "vitest";

import { createReferralsFeature } from "../src/registration.ts";
import { featureConfig } from "./support/config.ts";

const feature = () => createReferralsFeature(featureConfig());

describe("the referral feature's registration", () => {
  it("declares the routes, the pages and the navigation, so that removing it removes them all", () => {
    const { manifest } = feature();
    expect(manifest.id).toBe("referrals");
    expect(manifest.dependencies).toEqual(["accounts", "games"]);
    expect(manifest.routes.map(({ operationId }) => operationId)).toEqual([
      "setReferralProgram",
      "setReferrerFrozen",
      "takeBackReferralEarning",
      "requestReferralPayout",
      "getReferralCover",
      "startReferralBatch",
      "submitReferralBatch",
      "refreshReferralBatch",
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
      ["/admin/referrals/payouts", "referral:pay"],
      ["/admin/referrals/referrers/[referrerId]", "referral:view"],
    ]);
  });

  it("puts the overview in the admin navigation for staff, the program and the payouts only for those who may open them, and nothing in the bar every visitor sees or in the account menu (the wallet menu links the page itself)", () => {
    expect(
      feature().manifest.navigation.map(({ access, area, href }) => [
        area,
        href,
        access.kind === "platform" ? access.capability : access.kind,
      ]),
    ).toEqual([
      ["admin", "/admin/referrals", "referral:view"],
      ["admin", "/admin/referrals/program", "referral:administer"],
      ["admin", "/admin/referrals/payouts", "referral:pay"],
    ]);
  });
});
