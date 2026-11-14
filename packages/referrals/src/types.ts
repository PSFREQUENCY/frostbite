// What a new account was made with, as far as the referral rules need to know: the identity that opened it. A person who arrives with a
// referral code is a person with no account yet, so the identity is all there is to compare.
export type NewAccountIdentity =
  | {
      readonly kind: "wallet";
      readonly network: string;
      readonly scriptIdentity: string;
    }
  | { readonly kind: "contact" };

// Why a code did not become a link. The person is never told which: the sign-in goes on the same either way (a referral is never a reason
// to refuse an account).
export type NotLinkedReason =
  "no-code" | "self" | "shared-identity" | "unknown-code";

export type LinkOutcome =
  | { readonly kind: "linked"; readonly referrerId: string }
  | { readonly kind: "not-linked"; readonly reason: NotLinkedReason };

// A claim that took effect, as the referral program is told of it: who minted, what the platform charged on top, and in what asset.
export interface CompletedClaim {
  readonly chain: string;
  readonly claimId: string;
  readonly completedAt: Date;
  readonly gameId: string;
  readonly milestoneId: string;
  // What the platform charged on this claim in the chain's smallest unit (0: nothing), as it was when the transaction was built.
  readonly platformFee: bigint;
  readonly userId: string;
}
