import type {
  ReversalEffect,
  TakeBackResponse,
} from "@frostbite/shared/referrals";

import { whenLabel } from "./format.ts";

// The words of taking an earning back. An administrator is told, before they confirm, exactly what will happen to the money, in plain terms
// and by where the earning had got to; and told again, in the past tense, once it is done. Nothing here says "reverse", "ledger" or "debit".

export const takeBackWords = {
  button: "Take back",
  confirm: (amount: string) => `Take back ${amount}`,
  heading: "Take back this earning?",
  intro: (amount: string, when: Date) =>
    `This undoes the ${amount} earned on ${whenLabel(when)}. Nothing is deleted: the earning stays in the history, with a "taken back" line beside it, and it cannot be undone.`,
  keep: "Keep it",
  reasonHint: "Kept with your name and the time. The referrer does not see it.",
  reasonLabel: "Why are you taking it back?",
  reload: "Show the updated list",
  unreachable:
    "The platform did not answer, so nothing is known to have changed. Reload the page to see where this earning stands, and try again.",
  working: "Taking back…",
} as const;

// What will happen, said before it is done.
export const effectBefore: Record<ReversalEffect, (amount: string) => string> =
  {
    paid: (amount) =>
      `It was already paid out, and it cannot be taken from their wallet. Instead the same ${amount} is held back from what they earn next, until it is paid off.`,
    "pending-payout": (amount) =>
      `It is already inside a payout that has not finished. That payout will still be sent as it is, and the same ${amount} is then held back from what they earn next. If the payout fails, the earning goes back to their pot and this takes it out of there instead.`,
    pot: (amount) =>
      `It is not in a payout yet, so ${amount} leaves their pot. Nothing was paid, so nothing is owed back.`,
  };

// What happened, said once it is done.
export const effectAfter: Record<ReversalEffect, (amount: string) => string> = {
  paid: (amount) =>
    `Taken back. It was already paid out, so ${amount} will be held back from what they earn next, until it is paid off.`,
  "pending-payout": (amount) =>
    `Taken back. Its payout will still be sent as it is, and ${amount} will be held back from what they earn next.`,
  pot: (amount) => `Taken back. ${amount} has left their pot.`,
};

export function takeBackRefusalCopy(
  answer: Extract<TakeBackResponse, { status: "refused" }>,
): string {
  switch (answer.reason) {
    case "already-taken-back":
      return "This earning was already taken back. Reload the page to see it.";
    case "invalid-reason":
      return "Say why, in up to 500 characters.";
    case "not-found":
      return "That earning is not there any more. Reload the page.";
  }
}

// What the history says of an earning that was taken back (on the earning itself) and of the line that undid it.
export const takenBackLine = (
  who: string | null,
  at: Date,
  reason: string,
): string =>
  `Taken back by ${who ?? "an account that is gone"} on ${whenLabel(at)}: ${reason}`;
export const undoesLine = (
  who: string | null,
  at: Date,
  reason: string,
): string => `Undoes an earlier earning. ${takenBackLine(who, at, reason)}`;
