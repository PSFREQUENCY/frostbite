import { z } from "zod";

// What staff may do with the referral program (ADR-026). Looking is for any staff member; changing the program and freezing a referrer are
// for administrators only. The authorization policy grants them, so "who may" is stated in one place and not checked here.
export const referralViewCapability = "referral:view";
export const referralAdministerCapability = "referral:administer";

// The pages. The person's own are readable signed out (the first) so the incentive is stated before anyone joins.
export const referralsPath = "/referrals";
export const referralsHistoryPath = "/referrals/history";
export const referralsAdminPath = "/admin/referrals";
export const referralsAdminProgramPath = "/admin/referrals/program";
export const referralsAdminReferrersPath = "/admin/referrals/referrers";
export const referralsAdminReferrerPath =
  "/admin/referrals/referrers/[referrerId]";
export const referralsAdminReferrerHref = (referrerId: string) =>
  `${referralsAdminReferrersPath}/${referrerId}`;
export const referralsNavigationLabel = "Referrals";

const unitsSchema = z.string().regex(/^(?:0|[1-9][0-9]{0,18})$/u);

// Sets the program: every setting together, so a change is one row of the log and never half a decision. Amounts are digits, for they exceed
// what a number holds exactly.
export const setReferralProgramInputSchema = z
  .object({
    enabled: z.boolean(),
    maturitySeconds: z.number().int().min(0).max(2_147_483_647),
    minimumPayoutUnits: unitsSchema,
    rateBasisPoints: z.number().int().min(1).max(9_999),
  })
  .strict();
export const referralProgramRefusals = [
  "above-maximum",
  "invalid-rate",
] as const;
export const setReferralProgramResponseSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("saved") }).strict(),
  z
    .object({
      reason: z.enum(referralProgramRefusals),
      status: z.literal("refused"),
    })
    .strict(),
]);

// Freezes or unfreezes a referrer, with the reason kept.
export const setReferrerFrozenInputSchema = z
  .object({
    frozen: z.boolean(),
    reason: z.string().trim().min(1).max(500),
    referrerId: z.uuid(),
  })
  .strict();
export const referrerFrozenRefusals = ["invalid-reason", "not-found"] as const;
export const setReferrerFrozenResponseSchema = z.discriminatedUnion("status", [
  z.object({ frozen: z.boolean(), status: z.literal("saved") }).strict(),
  z
    .object({
      reason: z.enum(referrerFrozenRefusals),
      status: z.literal("refused"),
    })
    .strict(),
]);

export const referralAdminRoutes = {
  setFrozen: {
    method: "POST",
    operationId: "setReferrerFrozen",
    path: "/api/v1/referrals/admin/freeze",
  },
  setProgram: {
    method: "POST",
    operationId: "setReferralProgram",
    path: "/api/v1/referrals/admin/program",
  },
} as const;

export type SetReferralProgramInput = z.infer<
  typeof setReferralProgramInputSchema
>;
export type SetReferralProgramResponse = z.infer<
  typeof setReferralProgramResponseSchema
>;
export type SetReferrerFrozenInput = z.infer<
  typeof setReferrerFrozenInputSchema
>;
export type SetReferrerFrozenResponse = z.infer<
  typeof setReferrerFrozenResponseSchema
>;
