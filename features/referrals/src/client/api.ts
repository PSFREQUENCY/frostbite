import {
  createRequester,
  sameOriginFetch,
  type FetchLike,
} from "@frostbite/client-http";
import {
  referralAdminRoutes,
  referralBatchRoutes,
  referralPayoutRoute,
  referralCoverResponseSchema,
  takeBackResponseSchema,
  takeBackRoute,
  type TakeBackInput,
  type TakeBackResponse,
  refreshReferralBatchResponseSchema,
  startReferralBatchResponseSchema,
  submitReferralBatchResponseSchema,
  type ReferralCoverInput,
  type ReferralCoverResponse,
  type RefreshReferralBatchInput,
  type RefreshReferralBatchResponse,
  type StartReferralBatchInput,
  type StartReferralBatchResponse,
  type SubmitReferralBatchInput,
  type SubmitReferralBatchResponse,
  requestReferralPayoutResponseSchema,
  type RequestReferralPayoutInput,
  type RequestReferralPayoutResponse,
  setReferralProgramResponseSchema,
  setReferrerFrozenResponseSchema,
  type SetReferralProgramInput,
  type SetReferralProgramResponse,
  type SetReferrerFrozenInput,
  type SetReferrerFrozenResponse,
} from "@frostbite/shared/referrals";

export const referralsRequestTimeoutMs = 5_000;
// Building a batch asks the chain for fees and builds a transaction, so it is given longer than a look.
export const startBatchTimeoutMs = 10_000;

// The two things an administrator changes, as the page reaches them: one same-origin request each, with the session of whoever is signed in.
// A failure (including no session) is thrown as the requester throws it, for the caller to say.
export interface ReferralsApi {
  takeBack(input: TakeBackInput): Promise<TakeBackResponse>;
  cover(input: ReferralCoverInput): Promise<ReferralCoverResponse>;
  refreshBatch(
    input: RefreshReferralBatchInput,
  ): Promise<RefreshReferralBatchResponse>;
  startBatch(
    input: StartReferralBatchInput,
  ): Promise<StartReferralBatchResponse>;
  submitBatch(
    input: SubmitReferralBatchInput,
  ): Promise<SubmitReferralBatchResponse>;
  requestPayout(
    input: RequestReferralPayoutInput,
  ): Promise<RequestReferralPayoutResponse>;
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
    takeBack: (input) =>
      request(takeBackRoute, takeBackResponseSchema, {
        body: input,
        signal: AbortSignal.timeout(referralsRequestTimeoutMs),
      }),
    cover: (input) =>
      request(referralBatchRoutes.cover, referralCoverResponseSchema, {
        query: input,
        signal: AbortSignal.timeout(referralsRequestTimeoutMs),
      }),
    refreshBatch: (input) =>
      request(referralBatchRoutes.refresh, refreshReferralBatchResponseSchema, {
        body: input,
        signal: AbortSignal.timeout(referralsRequestTimeoutMs),
      }),
    startBatch: (input) =>
      request(referralBatchRoutes.start, startReferralBatchResponseSchema, {
        body: input,
        signal: AbortSignal.timeout(startBatchTimeoutMs),
      }),
    submitBatch: (input) =>
      request(referralBatchRoutes.submit, submitReferralBatchResponseSchema, {
        body: input,
        signal: AbortSignal.timeout(referralsRequestTimeoutMs),
      }),
    requestPayout: (input) =>
      request(referralPayoutRoute, requestReferralPayoutResponseSchema, {
        body: input,
        signal: AbortSignal.timeout(referralsRequestTimeoutMs),
      }),
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
