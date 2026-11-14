import {
  createRequester,
  sameOriginFetch,
  type FetchLike,
} from "@frostbite/client-http";
import {
  referralAdminRoutes,
  setReferralProgramResponseSchema,
  setReferrerFrozenResponseSchema,
  type SetReferralProgramInput,
  type SetReferralProgramResponse,
  type SetReferrerFrozenInput,
  type SetReferrerFrozenResponse,
} from "@frostbite/shared/referrals";

export const referralsRequestTimeoutMs = 5_000;

// The two things an administrator changes, as the page reaches them: one same-origin request each, with the session of whoever is signed in.
// A failure (including no session) is thrown as the requester throws it, for the caller to say.
export interface ReferralsApi {
  setFrozen(input: SetReferrerFrozenInput): Promise<SetReferrerFrozenResponse>;
  setProgram(
    input: SetReferralProgramInput,
  ): Promise<SetReferralProgramResponse>;
}

export function createReferralsApi(
  fetchImpl: FetchLike = sameOriginFetch,
): ReferralsApi {
  const request = createRequester(fetchImpl);
  return {
    setFrozen: (input) =>
      request(referralAdminRoutes.setFrozen, setReferrerFrozenResponseSchema, {
        body: input,
        signal: AbortSignal.timeout(referralsRequestTimeoutMs),
      }),
    setProgram: (input) =>
      request(
        referralAdminRoutes.setProgram,
        setReferralProgramResponseSchema,
        {
          body: input,
          signal: AbortSignal.timeout(referralsRequestTimeoutMs),
        },
      ),
  };
}
