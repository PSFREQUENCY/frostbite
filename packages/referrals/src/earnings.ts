import type { Entry, PayoutState, Rewards } from "@frostbite/rewards";

// Where one earning stands: waiting out the delay, ready to be paid, in a payout that has been asked for, paid, or taken back (a reversal is
// its own row, shown as it is).
export type EarningState =
  "in-payout" | "maturing" | "paid" | "payable" | "reversal";

export function earningStateOf(
  entry: Pick<Entry, "kind" | "payableAt" | "payoutId">,
  payoutState: PayoutState | undefined,
  now: Date,
): EarningState {
  if (entry.kind === "reversal") return "reversal";
  if (entry.payoutId !== null)
    return payoutState === "complete" ? "paid" : "in-payout";
  return entry.payableAt > now ? "maturing" : "payable";
}

export interface DescribedEarning {
  readonly entry: Entry;
  readonly state: EarningState;
}

// A page of entries with where each stands, reading the state of the payouts they are in once for all of them.
export async function describeEarnings(
  rewards: Pick<Rewards, "payouts">,
  entries: readonly Entry[],
  now: Date,
): Promise<readonly DescribedEarning[]> {
  const states = await rewards.payouts.statesOf([
    ...new Set(entries.flatMap(({ payoutId }) => payoutId ?? [])),
  ]);
  return entries.map((entry) => ({
    entry,
    state: earningStateOf(
      entry,
      entry.payoutId === null ? undefined : states.get(entry.payoutId),
      now,
    ),
  }));
}
