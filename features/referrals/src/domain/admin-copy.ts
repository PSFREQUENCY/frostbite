import type {
  SetReferralProgramResponse,
  SetReferrerFrozenResponse,
} from "@frostbite/shared/referrals";

import { unitsLabel, waitLabel } from "./format.ts";

// The words of the admin pages: the section names, what each is for, and what every refusal means to the person who asked.

export const adminWords = {
  eyebrow: "Admin",
  heading: "Referrals",
  intro:
    "How the referral program is doing, what it is set to, and who is earning.",
  sections: {
    overview: "Overview",
    payouts: "Payouts",
    program: "Program",
    referrers: "Referrers",
  },
} as const;

export const overviewWords = {
  frozen: "Frozen",
  minted: "Of those, minted",
  noEarnings:
    "Nothing has been earned yet. The first earning appears when someone brought by a referrer mints and the program is on.",
  owedHeading: "What the platform owes",
  referred: "People brought",
  referrers: "Referrers",
  totals: {
    inFlight: "In a payout",
    maturing: "Still waiting",
    owed: "Owed in all",
    paid: "Paid so far",
    payable: "Ready to pay",
  },
  treasuryNote:
    "These figures come from the ledger. What the wallet that pays holds is checked against what is waiting on the Payouts page, before a batch is built.",
} as const;

export const programWords = {
  enabledLabel: "Earning is on",
  history: "Who changed what",
  historyEmpty: "Nobody has set the program yet. It is off until someone does.",
  maturityHint: (maximum: number) =>
    `Seconds an earning waits before it can be paid (0 for no wait, at most ${String(maximum)}).`,
  maturityLabel: "Wait before payable (seconds)",
  minimumHint: (maximum: string) =>
    `The least a payout may be, in sats (at most ${unitsLabel(maximum)}).`,
  minimumLabel: "Minimum payout (sats)",
  notSet:
    "The program has not been set up. It is off, and the public page says so, until you save it.",
  rateHint: "Hundredths of a percent of the platform fee: 300 is 3%.",
  rateLabel: "Share of the fee (hundredths of a percent)",
  save: "Save program",
  saving: "Saving…",
  unreachable:
    "The platform did not answer, so nothing is known to have changed. Look at the current settings above and try again.",
} as const;

export const referrersWords = {
  empty:
    "Nobody has brought anyone yet. Referrers appear here once someone signs up with a link.",
  filters: { all: "All", frozen: "Frozen", waiting: "Something waiting" },
  noMatch: "No referrer matches this filter.",
  sorts: {
    pot: "Most waiting",
    recent: "Latest earning",
    referred: "Most brought",
  },
} as const;

export const referrerWords = {
  freezeHeading: "Pause or resume earning",
  freezeHint:
    "A pause stops new earnings. What was earned stays. The reason is kept.",
  freezeLabel: "Reason",
  frozenNow: "Earning is paused for this person.",
  history: "Pauses and resumes",
  historyEmpty: "Never paused.",
  notFound: "No such referrer.",
  pause: "Pause earning",
  resume: "Resume earning",
  unreachable:
    "The platform did not answer, so nothing is known to have changed. Look at the history and try again.",
} as const;

export function programRefusalCopy(
  answer: Extract<SetReferralProgramResponse, { status: "refused" }>,
): string {
  switch (answer.reason) {
    case "above-maximum":
      return "That is above what the platform allows for the wait or the minimum payout. Nothing was changed.";
    case "invalid-rate":
      return "The share must be between 0.01% and 99.99%. Nothing was changed.";
  }
}

export function programSavedCopy(input: {
  readonly enabled: boolean;
  readonly maturitySeconds: number;
  readonly minimumPayoutUnits: string;
}): string {
  return input.enabled
    ? `Saved. Earning is on, with a minimum payout of ${unitsLabel(input.minimumPayoutUnits)} and ${waitLabel(input.maturitySeconds)} before an earning can be paid.`
    : "Saved. Earning is off: nothing new is earned until you switch it on.";
}

export function freezeRefusalCopy(
  answer: Extract<SetReferrerFrozenResponse, { status: "refused" }>,
): string {
  switch (answer.reason) {
    case "invalid-reason":
      return "Give a reason of up to 500 characters. Nothing was changed.";
    case "not-found":
      return referrerWords.notFound;
  }
}
