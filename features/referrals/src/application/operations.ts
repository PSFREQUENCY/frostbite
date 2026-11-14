import type { HttpOperation } from "@frostbite/http";
import { unauthenticated } from "@frostbite/http/outcome";
import {
  referralAdministerCapability,
  referralAdminRoutes,
  setReferralProgramInputSchema,
  setReferralProgramResponseSchema,
  setReferrerFrozenInputSchema,
  setReferrerFrozenResponseSchema,
  type SetReferralProgramInput,
  type SetReferralProgramResponse,
  type SetReferrerFrozenInput,
  type SetReferrerFrozenResponse,
} from "@frostbite/shared/referrals";

import type { ReferralsRuntime } from "../runtime.ts";

type Resolve = () => Promise<ReferralsRuntime>;

// Changing the program and freezing a referrer are for administrators: the policy grants the capability, so who may is stated in one place.
const base = {
  access: { capability: referralAdministerCapability, kind: "platform" },
  applicationErrors: ["unauthorized"],
  idempotency: "none",
  input: "json",
} as const;

// Sets the program, as the signed-in administrator: every setting together, one row of the log. The person is the session, never a field of
// the request. A refusal says which rule was crossed.
export function createSetProgramOperation(resolve: Resolve) {
  const respond = (value: SetReferralProgramResponse) =>
    ({ ok: true, value }) as const;
  return {
    ...base,
    execute: async (input, context) => {
      if (context.actorUserId === null) return unauthenticated;
      const { program } = await resolve();
      const result = await program.set(context.actorUserId, {
        enabled: input.enabled,
        maturitySeconds: input.maturitySeconds,
        minimumPayout: BigInt(input.minimumPayoutUnits),
        rateBasisPoints: input.rateBasisPoints,
      });
      if (result.ok) return respond({ status: "saved" });
      return respond({
        reason:
          result.code === "above-maximum" ? "above-maximum" : "invalid-rate",
        status: "refused",
      });
    },
    inputSchema: setReferralProgramInputSchema,
    outputSchema: setReferralProgramResponseSchema,
    ...referralAdminRoutes.setProgram,
  } satisfies HttpOperation<
    SetReferralProgramInput,
    SetReferralProgramResponse
  >;
}

// Pauses or resumes earning for a referrer, with the reason kept. A person who is not a referrer's account is "not-found".
export function createSetFrozenOperation(resolve: Resolve) {
  const respond = (value: SetReferrerFrozenResponse) =>
    ({ ok: true, value }) as const;
  return {
    ...base,
    execute: async (input, context) => {
      if (context.actorUserId === null) return unauthenticated;
      const { admin, freezes } = await resolve();
      if ((await admin.referrer(input.referrerId, { limit: 1 })) === null)
        return respond({ reason: "not-found", status: "refused" });
      const result = await freezes.set(
        context.actorUserId,
        input.referrerId,
        input.frozen,
        input.reason,
      );
      return result.ok
        ? respond({ frozen: result.freeze.frozen, status: "saved" })
        : respond({ reason: "invalid-reason", status: "refused" });
    },
    inputSchema: setReferrerFrozenInputSchema,
    outputSchema: setReferrerFrozenResponseSchema,
    ...referralAdminRoutes.setFrozen,
  } satisfies HttpOperation<SetReferrerFrozenInput, SetReferrerFrozenResponse>;
}
