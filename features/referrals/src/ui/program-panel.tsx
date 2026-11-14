"use client";

import { useMemo } from "react";

import { createReferralsApi, type ReferralsApi } from "../client/api.ts";
import { ProgramForm, type ProgramFormValues } from "./program-form.tsx";

// The program form with its way to reach the platform. The page that shows it is made on the server and knows nothing of requests; this is
// where the form meets them, and where a test puts its own.
export function ProgramPanel({
  api: given,
  initial,
  maximumMaturitySeconds,
  maximumMinimumPayoutUnits,
}: {
  readonly api?: ReferralsApi | undefined;
  readonly initial: ProgramFormValues;
  readonly maximumMaturitySeconds: number;
  readonly maximumMinimumPayoutUnits: string;
}) {
  const api = useMemo(() => given ?? createReferralsApi(), [given]);
  return (
    <ProgramForm
      initial={initial}
      maximumMaturitySeconds={maximumMaturitySeconds}
      maximumMinimumPayoutUnits={maximumMinimumPayoutUnits}
      onSave={api.setProgram}
    />
  );
}
