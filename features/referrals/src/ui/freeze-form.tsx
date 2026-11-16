"use client";

import type {
  SetReferrerFrozenInput,
  SetReferrerFrozenResponse,
} from "@frostbite/shared/referrals";
import { ArcadeActionButton, ArcadeTextField } from "@repo/ui/arcade";
import { useMemo, useState } from "react";

import { createReferralsApi, type ReferralsApi } from "../client/api.ts";
import { freezeRefusalCopy, referrerWords } from "../domain/admin-copy.ts";

// Pauses or resumes earning for one referrer, with the reason that is kept. The button says what pressing it does (the opposite of what is
// now), and nothing is sent without a reason.
export function FreezeForm({
  api: given,
  frozen,
  referrerId,
}: {
  readonly api?: ReferralsApi | undefined;
  readonly frozen: boolean;
  readonly referrerId: string;
}) {
  const api = useMemo(() => given ?? createReferralsApi(), [given]);
  const [reason, setReason] = useState("");
  const [working, setWorking] = useState(false);
  const [note, setNote] = useState<{
    readonly kind: "alert" | "status";
    readonly text: string;
  } | null>(null);
  const send = async () => {
    setWorking(true);
    setNote(null);
    const input: SetReferrerFrozenInput = {
      frozen: !frozen,
      reason: reason.trim(),
      referrerId,
    };
    try {
      const answer: SetReferrerFrozenResponse = await api.setFrozen(input);
      if (answer.status === "refused") {
        setNote({ kind: "alert", text: freezeRefusalCopy(answer) });
        return;
      }
      setNote({
        kind: "status",
        text: answer.frozen
          ? "Earning is paused. Reload to see it in the history."
          : "Earning is on again. Reload to see it in the history.",
      });
      setReason("");
    } catch {
      setNote({ kind: "alert", text: referrerWords.unreachable });
    } finally {
      setWorking(false);
    }
  };
  return (
    <form
      aria-label={referrerWords.freezeHeading}
      className="arcade-form"
      onSubmit={(event) => {
        event.preventDefault();
        void send();
      }}
    >
      <ArcadeTextField
        hint={referrerWords.freezeHint}
        label={referrerWords.freezeLabel}
        maxLength={500}
        multiline
        onChange={setReason}
        value={reason}
      />
      <ArcadeActionButton
        busy={working}
        disabled={reason.trim() === ""}
        tone={frozen ? "mint" : "red"}
        type="submit"
      >
        {frozen ? referrerWords.resume : referrerWords.pause}
      </ArcadeActionButton>
      {note === null ? null : <p role={note.kind}>{note.text}</p>}
    </form>
  );
}
