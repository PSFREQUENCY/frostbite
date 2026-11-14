import {
  manageRolesCapability,
  type AuthorizationPolicy,
} from "@frostbite/shared/accounts";
import { collectionReviewCapability } from "@frostbite/shared/collections";
import { gameAdminCapability } from "@frostbite/shared/games";
import {
  referralAdministerCapability,
  referralViewCapability,
} from "@frostbite/shared/referrals";

// What each of the two working roles may do, written once so the administrator's powers are exactly these and cannot drift from them.
const reviewerCapabilities = [
  "creator:review",
  collectionReviewCapability,
] as const;
// Any staff member may administer a game's rewards contract, including pausing it (ADR-018 Amendment 3); every step is logged.
const staffCapabilities = [
  "platform:operate",
  gameAdminCapability,
  referralViewCapability,
] as const;

export const authorizationPolicy = {
  organization: {
    admin: ["organization:members"],
    analyst: ["organization:read"],
    editor: ["organization:edit"],
    owner: ["organization:members", "organization:ownership"],
  },
  platform: {
    // Grants and suspends platform roles, and may do everything staff and reviewers may, so one administrator can run the whole
    // console without also being given the other two roles. (Nobody can review their own collection, whatever they hold.)
    admin: [
      manageRolesCapability,
      ...reviewerCapabilities,
      ...staffCapabilities,
      // Changing the referral program and freezing a referrer move money owed to people: for administrators, not every staff member.
      referralAdministerCapability,
    ],
    reviewer: reviewerCapabilities,
    staff: staffCapabilities,
  },
  // Staff and admin take effect only while the account holds a wallet (ADR-021): they sign chain steps with one, and an email code
  // alone is too weak a way to hold them.
  requiredMethods: { admin: ["wallet"], staff: ["wallet"] },
  version: "beta-v4",
} as const satisfies AuthorizationPolicy;
