import { defineFeature } from "@frostbite/plugin-kit";
import type { ReferralsFeatureConfig } from "./config.ts";
import {
  referralAdministerCapability,
  referralAdminRoutes,
  referralPayoutRoute,
  referralsAdminPath,
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
      ],
      pages: [
        { access: { kind: "public" }, path: referralsPath },
        { access: { kind: "authenticated" }, path: referralsHistoryPath },
        { access: view, path: referralsAdminPath },
        { access: administer, path: referralsAdminProgramPath },
        { access: view, path: referralsAdminReferrersPath },
        { access: view, path: referralsAdminReferrerPath },
      ],
      requiredDecisionGates: [],
      requiredProviderCapabilities: [],
      routes: [
        referralAdminRoutes.setProgram,
        referralAdminRoutes.setFrozen,
        referralPayoutRoute,
      ],
      version: "1.0.0",
    },
    load: async () =>
      import("@frostbite/feature-referrals/entrypoint").then(
        ({ createReferralsEntrypoint }) => createReferralsEntrypoint(config),
      ),
  });
}
