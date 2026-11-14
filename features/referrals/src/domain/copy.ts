import type { ReferralProgram } from "@frostbite/referrals";

import { percentLabel, shareOf, unitsLabel, waitLabel } from "./format.ts";

// Every sentence of the referral pages, in one place (one catalogue of wording, so a sentence is said once and a reason is matched by code,
// never by text). The terms are written from the program record in force: the page cannot say one thing while the ledger does another.

export const pageWords = {
  adminEyebrow: "Admin",
  explainerHeading: "Bring a friend, earn from every mint",
  explainerIntro:
    "Share your link. When someone signs up with it and mints a milestone, you earn a share of the platform's fee on that mint.",
  historyHeading: "Your referral history",
  historyIntro: "Every earning and every payout, newest first.",
  userEyebrow: "Referrals",
} as const;

export const stateWords = {
  frozen:
    "Earning is paused on your account for now. What you have already earned is kept. Contact the team if you have a question.",
  off: "Referral earnings are switched off right now. Your link still works, and people who join with it stay linked to you.",
  signedOut: "Sign in to get your own link and see what you have earned.",
} as const;

// What a visitor is told before they join: the terms, each read from the record in force. `null` is a program nobody has set up yet.
export function termsOf(
  program: ReferralProgram | null,
  exampleFee: bigint,
): readonly string[] {
  if (program === null) return [];
  const example = shareOf(exampleFee, program.rateBasisPoints);
  return [
    `You earn ${percentLabel(program.rateBasisPoints)} of the platform fee on every milestone a person you brought mints. On a ${unitsLabel(exampleFee)} fee that is ${unitsLabel(example)} each time.`,
    "It lasts for as long as they play: there is no end date and no limit on how much you can earn.",
    program.maturitySeconds === 0
      ? "An earning can be paid out as soon as the mint is confirmed."
      : `An earning waits ${waitLabel(program.maturitySeconds)} after the mint is confirmed before it can be paid out.`,
    `You can ask to be paid once you have ${unitsLabel(program.minimumPayout)}; until then it keeps adding up.`,
    "Payouts are signed in batches by the team, so they are not instant.",
  ];
}

export const mineWords = {
  brought: (count: number) =>
    count === 1 ? "1 person signed up" : `${String(count)} people signed up`,
  copied: "Copied",
  copy: "Copy link",
  linkLabel: "Your referral link",
  minted: (count: number) =>
    count === 1 ? "1 has minted" : `${String(count)} have minted`,
  noneYet:
    "Nobody has signed up with your link yet. Share it and the first person who mints will show up here.",
  potHeading: "What you have earned",
  progress: (have: bigint, need: bigint) =>
    `${unitsLabel(have)} of ${unitsLabel(need)} needed to ask for a payout`,
  readyToClaim: "You have reached the minimum.",
  share: "Share",
  shareText: "Join me and play. Use my link:",
} as const;

export const historyWords = {
  earnings: "Earnings",
  empty:
    "Nothing earned yet. Earnings appear here when someone you brought mints a milestone.",
  noPayouts: "No payouts yet.",
  older: "Older",
  payouts: "Payouts",
  states: {
    "in-payout": "In a payout",
    maturing: "Waiting",
    paid: "Paid",
    payable: "Ready",
    reversal: "Taken back",
  },
  payoutStates: {
    cancelled: "Cancelled",
    complete: "Paid",
    failed: "Failed",
    in_progress: "Being paid",
    requested: "Waiting for a batch",
  },
} as const;
