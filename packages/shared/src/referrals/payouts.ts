import { z } from "zod";

import { feeSpeedSchema } from "../chain/fees.ts";
import { maxBatchPayments } from "../chain/transaction.ts";
import { maxAdminPayloadChars } from "../games/admin-step.ts";

// Paying referrers in a batch (ADR-026): staff build one transaction that pays every payout waiting, sign it with the wallet that pays, and
// the platform sends it and follows it to the chain. Who may is a capability of its own, granted to staff, because it moves the platform's
// money; looking at the program is `referral:view`.
export const referralPayCapability = "referral:pay";
export const referralsAdminPayoutsPath = "/admin/referrals/payouts";

const unitsSchema = z.string().regex(/^(?:0|[1-9][0-9]{0,18})$/u);

// The transaction as it crosses the page: the one staff sign, and the same once signed. Plain text throughout.
export const referralTransactionSchema = z
  .object({
    chain: z.string().min(1).max(64),
    family: z.string().min(1).max(64),
    format: z.string().trim().min(1).max(64),
    payload: z.string().min(1).max(maxAdminPayloadChars),
  })
  .strict();

export const referralBatchStates = [
  "awaiting_signature",
  "broadcast_accepted",
  "broadcast_rejected",
  "broadcast_unknown",
  "complete",
  "confirmed",
  "expired",
  "indexed_failure",
  "pending",
  "signed",
] as const;

// A batch as staff are shown it: what it pays and to whom, what it costs, and where it is. `toSign` is the transaction while it awaits a
// signature, and nothing after.
export const referralBatchSchema = z
  .object({
    assetKey: z.string().min(1).max(200),
    createdAt: z.iso.datetime(),
    expiresAt: z.iso.datetime(),
    failureReason: z.string().max(1000).nullable(),
    feeUnits: unitsSchema,
    id: z.uuid(),
    payments: z
      .array(
        z
          .object({ recipient: z.string().min(1).max(256), units: unitsSchema })
          .strict(),
      )
      .max(maxBatchPayments),
    sentAt: z.iso.datetime().nullable(),
    state: z.enum(referralBatchStates),
    toSign: referralTransactionSchema.nullable(),
    totalUnits: unitsSchema,
    transactionId: z.string().min(1).max(128).nullable(),
  })
  .strict();

export const skippedPayoutSchema = z
  .object({
    payoutId: z.uuid(),
    reason: z.enum(["dust", "invalid-address"]),
  })
  .strict();

export const startReferralBatchInputSchema = z
  .object({
    assetKey: z.string().min(1).max(200),
    feeSpeed: feeSpeedSchema.optional(),
    // The address of the wallet that pays, and signs.
    wallet: z.string().trim().min(1).max(256),
  })
  .strict();
export const startBatchRefusals = [
  "chain-unavailable",
  "cannot-pay",
  "costs-more-than-it-pays",
  "could-not-build",
  "invalid-sender",
  "nothing-to-pay",
] as const;
export const startReferralBatchResponseSchema = z.discriminatedUnion("status", [
  z
    .object({
      batch: referralBatchSchema,
      resumed: z.boolean(),
      skipped: z.array(skippedPayoutSchema).max(maxBatchPayments * 2),
      status: z.literal("started"),
    })
    .strict(),
  z
    .object({
      detail: z.string().max(500).optional(),
      reason: z.enum(startBatchRefusals),
      skipped: z.array(skippedPayoutSchema).max(maxBatchPayments * 2),
      status: z.literal("refused"),
    })
    .strict(),
]);

export const submitReferralBatchInputSchema = z
  .object({ batchId: z.uuid(), signed: referralTransactionSchema })
  .strict();
export const submitBatchRefusals = [
  "chain-unavailable",
  "expired",
  "invalid-signature",
  "not-awaiting-signature",
  "not-found",
] as const;
export const submitReferralBatchResponseSchema = z.discriminatedUnion(
  "status",
  [
    z
      .object({ batch: referralBatchSchema, status: z.literal("submitted") })
      .strict(),
    z
      .object({
        detail: z.string().max(500).optional(),
        reason: z.enum(submitBatchRefusals),
        status: z.literal("refused"),
      })
      .strict(),
  ],
);

export const refreshReferralBatchInputSchema = z
  .object({ batchId: z.uuid() })
  .strict();
export const refreshBatchRefusals = ["chain-unavailable", "not-found"] as const;
export const refreshReferralBatchResponseSchema = z.discriminatedUnion(
  "status",
  [
    z.object({ batch: referralBatchSchema, status: z.literal("ok") }).strict(),
    z
      .object({
        reason: z.enum(refreshBatchRefusals),
        status: z.literal("refused"),
      })
      .strict(),
  ],
);

export const referralBatchRoutes = {
  refresh: {
    method: "POST",
    operationId: "refreshReferralBatch",
    path: "/api/v1/referrals/payouts/refresh",
  },
  start: {
    method: "POST",
    operationId: "startReferralBatch",
    path: "/api/v1/referrals/payouts/start",
  },
  submit: {
    method: "POST",
    operationId: "submitReferralBatch",
    path: "/api/v1/referrals/payouts/submit",
  },
} as const;

export type ReferralBatch = z.infer<typeof referralBatchSchema>;
export type StartReferralBatchInput = z.infer<
  typeof startReferralBatchInputSchema
>;
export type StartReferralBatchResponse = z.infer<
  typeof startReferralBatchResponseSchema
>;
export type SubmitReferralBatchInput = z.infer<
  typeof submitReferralBatchInputSchema
>;
export type SubmitReferralBatchResponse = z.infer<
  typeof submitReferralBatchResponseSchema
>;
export type RefreshReferralBatchInput = z.infer<
  typeof refreshReferralBatchInputSchema
>;
export type RefreshReferralBatchResponse = z.infer<
  typeof refreshReferralBatchResponseSchema
>;
