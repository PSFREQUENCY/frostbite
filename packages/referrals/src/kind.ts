import { defineRewardKind } from "@frostbite/rewards";
import { z } from "zod";

export const referralProgramKey = "referral";
export const referralKindId = "referral-cut";
export const claimCompletedEvent = "claim.completed";

// The most a rate can be, in hundredths of a percent: always under the whole of the fee, so a person who mints through their own fake
// accounts always loses money to the network and the platform's share, whatever an admin sets.
export const maximumRateBasisPoints = 9_999;
const basisPointsInAll = 10_000n;

// What a claim that took effect tells the programs reading it (the platform fee, its asset, who minted, who brought them, and whether that
// person is earning). It is a fact about the claim; the kind decides what it earns.
export const claimCompletedPayload = z
  .object({
    asset: z.string().min(1).max(200),
    claimId: z.string().min(1).max(100),
    fee: z.string().regex(/^\d{1,30}$/u),
    gameId: z.string().min(1).max(100),
    milestoneId: z.string().min(1).max(100),
    minter: z.uuid(),
    referrer: z.uuid().nullable(),
    referrerFrozen: z.boolean(),
  })
  .strict();

export const referralCutParams = z
  .object({
    // Hundredths of a percent of the platform fee, so 300 is 3%.
    rateBasisPoints: z.number().int().min(1).max(maximumRateBasisPoints),
  })
  .strict();

export const sourceKeyOfClaim = (claimId: string): string =>
  `${claimCompletedEvent}:${claimId}`;

// The claim an earning was for, read back from its source key (none for a key that is not a claim's).
export function claimIdOfSource(sourceKey: string): string | null {
  const prefix = `${claimCompletedEvent}:`;
  return sourceKey.startsWith(prefix) ? sourceKey.slice(prefix.length) : null;
}

// How a claim earns the referrer a cut: a share of the platform fee the claim carried, once for each claim, nothing for a person nobody
// referred, nothing while the referrer is frozen, and nothing when the share rounds down to nothing.
export const referralCut = defineRewardKind({
  accrue: ({ params, payload }) => {
    if (payload.referrer === null || payload.referrerFrozen) return [];
    const amount =
      (BigInt(payload.fee) * BigInt(params.rateBasisPoints)) / basisPointsInAll;
    return amount === 0n
      ? []
      : [
          {
            amount,
            assetKey: payload.asset,
            beneficiaryId: payload.referrer,
            sourceKey: sourceKeyOfClaim(payload.claimId),
          },
        ];
  },
  eventType: claimCompletedEvent,
  id: referralKindId,
  paramsSchema: referralCutParams,
  payloadSchema: claimCompletedPayload,
});
