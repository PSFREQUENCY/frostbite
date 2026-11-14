"use client";

import type { AdminEarning } from "@frostbite/referrals";
import { ArcadeActionButton, ArcadeBadge, ConsoleRow } from "@repo/ui/arcade";
import { useState } from "react";

import type { ReferralsApi } from "../client/api.ts";
import { historyWords } from "../domain/copy.ts";
import { unitsLabel, whenLabel } from "../domain/format.ts";
import {
  takenBackLine,
  takeBackWords,
  undoesLine,
} from "../domain/take-back-copy.ts";
import { TakeBackForm } from "./take-back-form.tsx";

const tones = {
  "in-payout": "yellow",
  maturing: "yellow",
  paid: "mint",
  payable: "cyan",
  reversal: "pink",
} as const;

// One earning followed to the mint behind it: the game and milestone, and the claim's id, so a figure can be traced to what earned it.
const claimLine = (claim: AdminEarning["claim"]) =>
  claim === null
    ? "Not from a claim"
    : `${claim.gameId} · ${claim.milestoneId} · claim ${claim.claimId}`;

// One line of a referrer's earnings. An earning that was taken back says so, by whom and why; one that can be taken back (for an administrator)
// has the button, which opens the form below the line, so the consequence is read next to the thing it is about.
export function EarningRow({
  api,
  earning,
  mayTakeBack,
}: {
  readonly api?: ReferralsApi | undefined;
  readonly earning: AdminEarning;
  readonly mayTakeBack: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { state, takenBack } = earning;
  const amount = unitsLabel(
    earning.amount < 0n ? -earning.amount : earning.amount,
  );
  const about =
    takenBack === null
      ? claimLine(earning.claim)
      : (state === "reversal" ? undoesLine : takenBackLine)(
          takenBack.by,
          takenBack.at,
          takenBack.reason,
        );
  const canTakeBack = mayTakeBack && takenBack === null && state !== "reversal";
  return (
    <>
      <ConsoleRow
        action={
          takenBack !== null && state !== "reversal" ? (
            <ArcadeBadge tone="pink">
              {historyWords.states.reversal}
            </ArcadeBadge>
          ) : canTakeBack && !open ? (
            <span className="ref-takeback__row-actions">
              <ArcadeBadge tone={tones[state]}>
                {historyWords.states[state]}
              </ArcadeBadge>
              <ArcadeActionButton
                ariaLabel={`${takeBackWords.button} +${amount}`}
                size="small"
                onClick={() => setOpen(true)}
              >
                {takeBackWords.button}
              </ArcadeActionButton>
            </span>
          ) : (
            <ArcadeBadge tone={tones[state]}>
              {historyWords.states[state]}
            </ArcadeBadge>
          )
        }
        detail={`${whenLabel(earning.at)} · ${about}`}
        name={`${earning.amount < 0n ? "−" : "+"}${amount}`}
      />
      {canTakeBack && open ? (
        <li className="ref-takeback__panel">
          <TakeBackForm
            amount={amount}
            api={api}
            earnedAt={earning.at}
            earningId={earning.id}
            onClose={() => setOpen(false)}
            state={state}
          />
        </li>
      ) : null}
    </>
  );
}
