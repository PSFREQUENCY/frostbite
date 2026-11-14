import type {
  ReferralBatch,
  ReferralCoverResponse,
  RefreshReferralBatchResponse,
  StartReferralBatchResponse,
  SubmitReferralBatchResponse,
} from "@frostbite/shared/referrals";

import { unitsLabel } from "./format.ts";

// The words of the Payouts section: what each state of a batch means to the staff member who built it, and what every refusal means and what
// to do about it. A state is never told as done before the network's records say it is.

export const payoutsWords = {
  build: "Build the batch",
  building: "Building…",
  eyebrow: "Admin",
  emptyQueue:
    "Nothing is waiting. A payout appears here when a referrer asks to be paid.",
  heading: "Referral payouts",
  historyEmpty: "No batch has been built yet.",
  intro:
    "Referrers who asked to be paid wait here for a batch: one transaction that pays all of them, which you sign with the wallet that pays.",
  noChain:
    "Paying is not available: this platform has no network it can pay on. Nothing here can be built until it has.",
  queue: "Waiting for a batch",
  unreachable:
    "The platform did not answer, so nothing is known to have changed. Look at the batch below and try again.",
  walletHint:
    "The wallet that pays, and signs. It pays the network fee as well, so every referrer gets all they asked for.",
  walletLabel: "Paying wallet address",
} as const;

export const batchStateWords: Record<
  ReferralBatch["state"],
  { readonly detail: string; readonly label: string }
> = {
  awaiting_signature: {
    detail:
      "Check what it pays, then sign it with the paying wallet. Nothing is sent, and no payout changes, until you do.",
    label: "Waiting for your signature",
  },
  broadcast_accepted: {
    detail:
      "The network has it. It is not paid until the network confirms it; this page looks again every few seconds.",
    label: "Sent",
  },
  broadcast_rejected: {
    detail:
      "The network refused it. Nothing was spent, and the payouts are waiting for the next batch.",
    label: "Refused by the network",
  },
  broadcast_unknown: {
    detail:
      "It was sent but the network has not been seen to hold it. The platform looks again and sends the same signed bytes again.",
    label: "Sent, not yet seen",
  },
  complete: {
    detail: "The network confirmed it, and every payout in it is paid.",
    label: "Paid",
  },
  confirmed: {
    detail: "The network has confirmed it. The payouts are being marked paid.",
    label: "Confirmed",
  },
  expired: {
    detail:
      "It ran out of time before it was signed. The payouts are waiting; build a new batch.",
    label: "Expired",
  },
  indexed_failure: {
    detail:
      "The network included it and it did not take effect. Nothing was paid, and the payouts are back in the referrers' pots, to be asked for again.",
    label: "Failed",
  },
  pending: {
    detail:
      "The network has seen it and is waiting for it to be final. Not paid yet.",
    label: "Waiting for confirmations",
  },
  signed: {
    detail: "Signed and about to be sent.",
    label: "Signed",
  },
};

export const settledBatch = (state: ReferralBatch["state"]): boolean =>
  state === "complete" ||
  state === "expired" ||
  state === "broadcast_rejected" ||
  state === "indexed_failure";

const notAnAddressOnNetwork =
  "That is not an address on this network. Check the paying wallet's address.";

export function startRefusalCopy(
  answer: Extract<StartReferralBatchResponse, { status: "refused" }>,
): string {
  switch (answer.reason) {
    case "cannot-pay":
      return `The paying wallet cannot afford this batch${answer.detail === undefined ? "" : ` (${answer.detail})`}. Fund it, or use another wallet.`;
    case "chain-unavailable":
      return "The platform cannot reach that network right now. Try again shortly.";
    case "costs-more-than-it-pays":
      return "The network fee would be more than this batch pays out. It is left to grow: wait for more payouts, or for the fee to fall.";
    case "could-not-build":
      return `The batch could not be built${answer.detail === undefined ? "" : ` (${answer.detail})`}. Try again, or with a different wallet.`;
    case "invalid-sender":
      return notAnAddressOnNetwork;
    case "nothing-to-pay":
      return "Nothing is waiting for a batch, or what is waiting cannot be paid (see below).";
  }
}

const noSuchBatch = "There is no such batch.";

export function submitRefusalCopy(
  answer: Extract<SubmitReferralBatchResponse, { status: "refused" }>,
): string {
  switch (answer.reason) {
    case "chain-unavailable":
      return "The platform could not send it to the network just now. Nothing is known to have been sent; try again.";
    case "expired":
      return "The batch ran out of time before it was signed. Build a new one.";
    case "invalid-signature":
      return "What the wallet signed is not what was shown, so nothing was sent. Build the batch again and sign what is shown.";
    case "not-awaiting-signature":
      return "This batch is not waiting for a signature (it may already have been signed). Look at its state below.";
    case "not-found":
      return noSuchBatch;
  }
}

export function refreshRefusalCopy(
  answer: Extract<RefreshReferralBatchResponse, { status: "refused" }>,
): string {
  return answer.reason === "not-found"
    ? noSuchBatch
    : "The platform could not reach the network just now. It will look again.";
}

export const skippedWords = {
  dust: "is under what the network relays, so it cannot be paid yet",
  "invalid-address": "is to an address the network does not accept",
} as const;

export const totalLine = (batch: ReferralBatch): string =>
  `${String(batch.payments.length)} ${batch.payments.length === 1 ? "payment" : "payments"}, ${unitsLabel(batch.totalUnits)} in all, and ${unitsLabel(batch.feeUnits)} of network fee on top`;

// What a look at the paying wallet says. The network fee is added when the batch is built, so "enough" is for the payments alone.
export const coverWords = {
  check: "Check the wallet covers it",
  checking: "Looking…",
  nothingWaiting:
    "Nothing is waiting in this asset, so there is nothing to cover.",
  refused: {
    "chain-unavailable":
      "The platform cannot read that network just now, so it cannot say what the wallet holds. Try again shortly.",
    "invalid-wallet": notAnAddressOnNetwork,
  },
  unreachable:
    "The platform did not answer, so what the wallet holds is not known. Try again.",
} as const;

export function coverLine(
  cover: Extract<ReferralCoverResponse, { status: "ok" }>,
): string {
  const held = BigInt(cover.heldUnits);
  const waiting = BigInt(cover.waitingUnits);
  const pending =
    cover.pendingUnits === "0"
      ? ""
      : ` A further ${unitsLabel(cover.pendingUnits)} is still waiting for its first confirmation and cannot be spent yet.`;
  const waits = `${String(cover.payments)} ${cover.payments === 1 ? "payout waits" : "payouts wait"}, ${unitsLabel(cover.waitingUnits)} in all`;
  return held >= waiting
    ? `The wallet holds ${unitsLabel(cover.heldUnits)} that can be spent; ${waits}. That covers the payments; the network fee comes on top when the batch is built.${pending}`
    : `The wallet holds ${unitsLabel(cover.heldUnits)} that can be spent; ${waits}. It is short by ${unitsLabel((waiting - held).toString())} before any network fee: fund it, or use another wallet.${pending}`;
}
