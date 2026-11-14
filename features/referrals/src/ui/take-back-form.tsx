"use client";

import {
  reversalEffectOf,
  type TakeBackState,
} from "@frostbite/shared/referrals";
import { ArcadeActionButton, ArcadeTextField } from "@repo/ui/arcade";
import { useMemo, useState } from "react";

import { createReferralsApi, type ReferralsApi } from "../client/api.ts";
import {
  effectAfter,
  effectBefore,
  takeBackRefusalCopy,
  takeBackWords,
} from "../domain/take-back-copy.ts";

// Takes one earning back. It says what will happen to the money before anything is sent (by where the earning has got to), asks for a reason,
// and says what happened once it is done. Nothing is sent without a reason, and the button names the amount it takes back.
export function TakeBackForm({
  amount,
  api: given,
  earnedAt,
  earningId,
  onClose,
  state,
}: {
  readonly amount: string;
  readonly api?: ReferralsApi | undefined;
  readonly earnedAt: Date;
  readonly earningId: string;
  readonly onClose: () => void;
  readonly state: TakeBackState;
}) {
  const api = useMemo(() => given ?? createReferralsApi(), [given]);
  const [reason, setReason] = useState("");
  const [working, setWorking] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const send = async () => {
    setWorking(true);
    setProblem(null);
    try {
      const answer = await api.takeBack({
        earningId,
        reason: reason.trim(),
      });
      if (answer.status === "refused") setProblem(takeBackRefusalCopy(answer));
      else setDone(effectAfter[answer.effect](amount));
    } catch {
      setProblem(takeBackWords.unreachable);
    } finally {
      setWorking(false);
    }
  };
  if (done !== null)
    return (
      <div className="ref-takeback" role="status">
        <p>{done}</p>
        <ArcadeActionButton
          onClick={() => window.location.reload()}
          tone="mint"
        >
          {takeBackWords.reload}
        </ArcadeActionButton>
      </div>
    );
  return (
    <form
      aria-label={takeBackWords.heading}
      className="arcade-form ref-takeback"
      onSubmit={(event) => {
        event.preventDefault();
        void send();
      }}
    >
      <h3>{takeBackWords.heading}</h3>
      <p>{takeBackWords.intro(amount, earnedAt)}</p>
      <p className="ref-takeback__effect">
        {effectBefore[reversalEffectOf(state)](amount)}
      </p>
      <ArcadeTextField
        hint={takeBackWords.reasonHint}
        label={takeBackWords.reasonLabel}
        maxLength={500}
        multiline
        onChange={setReason}
        value={reason}
      />
      <div className="ref-takeback__actions">
        <ArcadeActionButton
          busy={working}
          disabled={reason.trim() === ""}
          tone="red"
          type="submit"
        >
          {working ? takeBackWords.working : takeBackWords.confirm(amount)}
        </ArcadeActionButton>
        <ArcadeActionButton disabled={working} onClick={onClose}>
          {takeBackWords.keep}
        </ArcadeActionButton>
      </div>
      {problem === null ? null : <p role="alert">{problem}</p>}
    </form>
  );
}
