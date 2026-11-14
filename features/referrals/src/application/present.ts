import type { StoredBatch } from "@frostbite/referrals";
import type { ReferralBatch } from "@frostbite/shared/referrals";

// The state a batch is told in: the lifecycle has a few states a batch never rests in, which are told as the neighbour they lead to.
const stateOf = (state: StoredBatch["state"]): ReferralBatch["state"] => {
  switch (state) {
    case "constructed":
    case "simulated":
      return "awaiting_signature";
    case "indexed_success":
    case "reconciled":
      return "confirmed";
    default:
      return state;
  }
};

// A batch as staff are shown it: each payment (who, how much), the sum, the network fee the sender pays on top, and where it stands.
// The transaction to sign is included only while it awaits a signature.
export function toWireBatch(batch: StoredBatch): ReferralBatch {
  const { summary } = batch.unsigned;
  const payments = (summary.payments ?? []).map(({ amount, recipient }) => ({
    recipient: recipient.value,
    units: amount.baseUnits.toString(),
  }));
  return {
    assetKey: batch.assetKey,
    createdAt: batch.createdAt.toISOString(),
    expiresAt: batch.expiresAt.toISOString(),
    failureReason: batch.failureReason,
    feeUnits: summary.fee.baseUnits.toString(),
    id: batch.id,
    payments,
    sentAt: batch.broadcastAt?.toISOString() ?? null,
    state: stateOf(batch.state),
    toSign:
      batch.state === "awaiting_signature"
        ? {
            chain: batch.unsigned.chain,
            family: batch.unsigned.family,
            format: batch.unsigned.format,
            payload: batch.unsigned.payload,
          }
        : null,
    totalUnits: (summary.payments ?? [])
      .reduce((sum, { amount }) => sum + amount.baseUnits, 0n)
      .toString(),
    transactionId: batch.transactionId,
  };
}
