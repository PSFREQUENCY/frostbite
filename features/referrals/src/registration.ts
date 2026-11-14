import { defineFeature } from "@frostbite/plugin-kit";
import type { ReferralsFeatureConfig } from "./config.ts";
import {
  referralAdministerCapability,
  referralAdminRoutes,
  referralPayCapability,
  referralBatchRoutes,
  referralPayoutRoute,
  referralsAdminPath,
  referralsAdminPayoutsPath,
  referralsAdminProgramPath,
  referralsAdminReferrerPath,
  referralsAdminReferrersPath,
  referralsHistoryPath,
  referralsNavigationLabel,
  referralsPath,
  referralViewCapability,
} from "@frostbite/shared/referrals";

export type { ReferralsFeatureConfig } from "./config.ts";

const view = { capability: referralViewCapability, kind: "platform" } as const;
const pay = { capability: referralPayCapability, kind: "platform" } as const;
const administer = {
  capability: referralAdministerCapability,
  kind: "platform",
} as const;

// The referral program's pages and the two things an administrator changes (ADR-026): a person's own page and history, and the admin
// section (the overview, the program, the referrers). Both read the same program record and ledger as the earning does. Removing this one
// registration removes every page, route and navigation entry; the earning itself (in the claims) does not depend on it.
export function createReferralsFeature(config: ReferralsFeatureConfig) {
  return defineFeature({
    manifest: {
      capabilities: [
        "api-routes",
        "authenticated-page",
        "navigation",
        "public-page",
        "studio-page",
      ],
      dependencies: ["accounts", "games"],
      id: "referrals",
      navigation: [
        {
          access: view,
          area: "admin",
          href: referralsAdminPath,
          label: referralsNavigationLabel,
          order: 30,
        },
        {
          access: administer,
          area: "admin",
          href: referralsAdminProgramPath,
          label: "Referral program",
          order: 31,
        },
        {
          access: pay,
          area: "admin",
          href: referralsAdminPayoutsPath,
          label: "Referral payouts",
          order: 32,
        },
      ],
      pages: [
        { access: { kind: "public" }, path: referralsPath },
        { access: { kind: "authenticated" }, path: referralsHistoryPath },
        { access: view, path: referralsAdminPath },
        { access: administer, path: referralsAdminProgramPath },
        { access: view, path: referralsAdminReferrersPath },
        { access: pay, path: referralsAdminPayoutsPath },
        { access: view, path: referralsAdminReferrerPath },
      ],
      requiredDecisionGates: [],
      requiredProviderCapabilities: [],
      routes: [
        referralAdminRoutes.setProgram,
        referralAdminRoutes.setFrozen,
        referralPayoutRoute,
        referralBatchRoutes.start,
        referralBatchRoutes.submit,
        referralBatchRoutes.refresh,
      ],
      version: "1.0.0",
    },
    load: async () =>
      import("@frostbite/feature-referrals/entrypoint").then(
        ({ createReferralsEntrypoint }) => createReferralsEntrypoint(config),
      ),
  });
}
