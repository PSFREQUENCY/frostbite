import type { HttpOperation } from "@frostbite/http";
import { unauthenticated } from "@frostbite/http/outcome";
import { signedTransactionSchema } from "@frostbite/shared/chain";
import {
  referralBatchRoutes,
  referralCoverInputSchema,
  referralCoverResponseSchema,
  type ReferralCoverInput,
  type ReferralCoverResponse,
  referralPayCapability,
  refreshReferralBatchInputSchema,
  refreshReferralBatchResponseSchema,
  startReferralBatchInputSchema,
  startReferralBatchResponseSchema,
  submitReferralBatchInputSchema,
  submitReferralBatchResponseSchema,
  type RefreshReferralBatchInput,
  type RefreshReferralBatchResponse,
  type StartReferralBatchInput,
  type StartReferralBatchResponse,
  type SubmitReferralBatchInput,
  type SubmitReferralBatchResponse,
} from "@frostbite/shared/referrals";

import type { ReferralsRuntime } from "../runtime.ts";
import { toWireBatch } from "./present.ts";

type Resolve = () => Promise<ReferralsRuntime>;

// Paying referrers is for staff (`referral:pay`), who sign the transaction with their own wallet. Who is acting is the session, never a field
// of the request.
const base = {
  access: { capability: referralPayCapability, kind: "platform" },
  applicationErrors: ["unauthorized"],
  idempotency: "none",
  input: "json",
} as const;

// Builds the batch for staff to review and sign: the payouts waiting in the asset, each to its own address, paid by the wallet named. A batch
// already in progress for the asset is returned instead of a second. What cannot be built is an answer, with why.
export function createStartBatchOperation(resolve: Resolve) {
  const respond = (value: StartReferralBatchResponse) =>
    ({ ok: true, value }) as const;
  return {
    ...base,
    execute: async (input, context) => {
      if (context.actorUserId === null) return unauthenticated;
      const { batches } = await resolve();
      const result = await batches.start({
        assetKey: input.assetKey,
        ...(input.feeSpeed === undefined ? {} : { feeSpeed: input.feeSpeed }),
        sender: input.wallet,
        staffId: context.actorUserId,
      });
      if (!result.ok)
        return respond({
          ...(result.reason === undefined ? {} : { detail: result.reason }),
          reason: result.code,
          skipped: [...(result.skipped ?? [])],
          status: "refused",
        });
      return respond({
        batch: toWireBatch(result.batch),
        resumed: result.resumed,
        skipped: [...result.skipped],
        status: "started",
      });
    },
    inputSchema: startReferralBatchInputSchema,
    outputSchema: startReferralBatchResponseSchema,
    ...referralBatchRoutes.start,
  } satisfies HttpOperation<
    StartReferralBatchInput,
    StartReferralBatchResponse
  >;
}

// Takes what staff signed for a batch: checked against what was built, kept with who sent it, and sent to the network once.
export function createSubmitBatchOperation(resolve: Resolve) {
  const respond = (value: SubmitReferralBatchResponse) =>
    ({ ok: true, value }) as const;
  return {
    ...base,
    execute: async (input, context) => {
      if (context.actorUserId === null) return unauthenticated;
      const { batches } = await resolve();
      const result = await batches.submit({
        batchId: input.batchId,
        signed: signedTransactionSchema.parse(input.signed),
        staffId: context.actorUserId,
      });
      return result.ok
        ? respond({ batch: toWireBatch(result.record), status: "submitted" })
        : respond({
            ...(result.reason === undefined ? {} : { detail: result.reason }),
            reason: result.code,
            status: "refused",
          });
    },
    inputSchema: submitReferralBatchInputSchema,
    outputSchema: submitReferralBatchResponseSchema,
    ...referralBatchRoutes.submit,
  } satisfies HttpOperation<
    SubmitReferralBatchInput,
    SubmitReferralBatchResponse
  >;
}

// Looks at the chain once for a batch and moves it (and the ledger) as far as the evidence allows; the page asks until it is over.
export function createRefreshBatchOperation(resolve: Resolve) {
  const respond = (value: RefreshReferralBatchResponse) =>
    ({ ok: true, value }) as const;
  return {
    ...base,
    execute: async (input, context) => {
      if (context.actorUserId === null) return unauthenticated;
      const { batches } = await resolve();
      const result = await batches.refresh(input.batchId);
      return result.ok
        ? respond({ batch: toWireBatch(result.record), status: "ok" })
        : respond({ reason: result.code, status: "refused" });
    },
    inputSchema: refreshReferralBatchInputSchema,
    outputSchema: refreshReferralBatchResponseSchema,
    ...referralBatchRoutes.refresh,
  } satisfies HttpOperation<
    RefreshReferralBatchInput,
    RefreshReferralBatchResponse
  >;
}

// Whether the wallet that would pay holds what is waiting, said before a batch is built so staff know before they ask. A read of the chain and
// the ledger; nothing is kept and nothing changes.
export function createCoverOperation(resolve: Resolve) {
  return {
    ...base,
    cache: { kind: "no-store" },
    execute: async (input) => {
      const { cover } = await resolve();
      const result = await cover(input);
      return {
        ok: true,
        value: result.ok
          ? {
              heldUnits: result.heldUnits.toString(),
              payments: result.payments,
              pendingUnits: result.pendingUnits.toString(),
              status: "ok",
              waitingUnits: result.waitingUnits.toString(),
            }
          : { reason: result.reason, status: "refused" },
      } as const;
    },
    input: "query",
    inputSchema: referralCoverInputSchema,
    outputSchema: referralCoverResponseSchema,
    ...referralBatchRoutes.cover,
  } satisfies HttpOperation<ReferralCoverInput, ReferralCoverResponse>;
}
