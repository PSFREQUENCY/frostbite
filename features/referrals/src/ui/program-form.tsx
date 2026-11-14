"use client";

import type {
  SetReferralProgramInput,
  SetReferralProgramResponse,
} from "@frostbite/shared/referrals";
import { ArcadeActionButton, ArcadeTextField } from "@repo/ui/arcade";
import { useState } from "react";

import {
  programRefusalCopy,
  programSavedCopy,
  programWords,
} from "../domain/admin-copy.ts";

export interface ProgramFormValues {
  readonly enabled: boolean;
  readonly maturitySeconds: string;
  readonly minimumPayoutUnits: string;
  readonly rateBasisPoints: string;
}

const digits = /^(?:0|[1-9][0-9]{0,18})$/u;

// Sets the whole program together, so a change is one row of the log. The page says each rule as it is typed against (digits, the rate's
// range), and the platform checks them all again before it keeps anything, along with the ceilings.
export function ProgramForm({
  initial,
  maximumMaturitySeconds,
  maximumMinimumPayoutUnits,
  onSave,
}: {
  readonly initial: ProgramFormValues;
  readonly maximumMaturitySeconds: number;
  readonly maximumMinimumPayoutUnits: string;
  readonly onSave: (
    input: SetReferralProgramInput,
  ) => Promise<SetReferralProgramResponse>;
}) {
  const [values, setValues] = useState(initial);
  const [working, setWorking] = useState(false);
  const [note, setNote] = useState<{
    readonly kind: "alert" | "status";
    readonly text: string;
  } | null>(null);
  const rate = Number(values.rateBasisPoints);
  const wait = Number(values.maturitySeconds);
  const rateOk =
    digits.test(values.rateBasisPoints) && rate >= 1 && rate <= 9_999;
  const waitOk =
    digits.test(values.maturitySeconds) && wait <= maximumMaturitySeconds;
  const minimumOk = digits.test(values.minimumPayoutUnits);
  const valid = rateOk && waitOk && minimumOk;
  const unchanged = JSON.stringify(values) === JSON.stringify(initial);
  const set = (change: Partial<ProgramFormValues>) =>
    setValues({ ...values, ...change });
  const save = async () => {
    setWorking(true);
    setNote(null);
    const input = {
      enabled: values.enabled,
      maturitySeconds: wait,
      minimumPayoutUnits: values.minimumPayoutUnits,
      rateBasisPoints: rate,
    };
    try {
      const answer = await onSave(input);
      setNote(
        answer.status === "saved"
          ? { kind: "status", text: programSavedCopy(input) }
          : { kind: "alert", text: programRefusalCopy(answer) },
      );
    } catch {
      setNote({ kind: "alert", text: programWords.unreachable });
    } finally {
      setWorking(false);
    }
  };
  return (
    <form
      aria-label="Referral program"
      className="arcade-form"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <label className="ref-switch">
        <input
          checked={values.enabled}
          onChange={(event) => set({ enabled: event.target.checked })}
          type="checkbox"
        />
        {programWords.enabledLabel}
      </label>
      <div className="ref-fields">
        <ArcadeTextField
          error={rateOk ? null : "A whole number from 1 to 9,999."}
          hint={programWords.rateHint}
          inputMode="numeric"
          label={programWords.rateLabel}
          maxLength={4}
          onChange={(rateBasisPoints) => set({ rateBasisPoints })}
          value={values.rateBasisPoints}
        />
        <ArcadeTextField
          error={
            minimumOk ? null : "Whole sats, in digits only (0 for no minimum)."
          }
          hint={programWords.minimumHint(maximumMinimumPayoutUnits)}
          inputMode="numeric"
          label={programWords.minimumLabel}
          maxLength={19}
          onChange={(minimumPayoutUnits) => set({ minimumPayoutUnits })}
          value={values.minimumPayoutUnits}
        />
        <ArcadeTextField
          error={
            waitOk
              ? null
              : `Whole seconds, at most ${String(maximumMaturitySeconds)}.`
          }
          hint={programWords.maturityHint(maximumMaturitySeconds)}
          inputMode="numeric"
          label={programWords.maturityLabel}
          maxLength={10}
          onChange={(maturitySeconds) => set({ maturitySeconds })}
          value={values.maturitySeconds}
        />
      </div>
      <ArcadeActionButton
        busy={working}
        disabled={!valid || unchanged}
        tone="mint"
        type="submit"
      >
        {working ? programWords.saving : programWords.save}
      </ArcadeActionButton>
      {note === null ? null : <p role={note.kind}>{note.text}</p>}
    </form>
  );
}
