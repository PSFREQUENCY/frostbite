"use client";

import type { RequestReferralPayoutResponse } from "@frostbite/shared/referrals";
import { ArcadeActionButton, ArcadeSelect } from "@repo/ui/arcade";
import { useMemo, useState } from "react";

import { createReferralsApi, type ReferralsApi } from "../client/api.ts";
import { payoutWords } from "../domain/copy.ts";
import { unitsLabel } from "../domain/format.ts";

function refusalCopy(
  answer: Extract<RequestReferralPayoutResponse, { status: "refused" }>,
): string {
  if (answer.reason === "below-dust" || answer.reason === "below-minimum")
    return payoutWords.tooSmall(
      unitsLabel(answer.minimumUnits ?? "0"),
      unitsLabel(answer.payableUnits ?? "0"),
    );
  return payoutWords.refusals[answer.reason];
}

// Asking to be paid what is ready: the wallet of the account to pay to (the platform checks it is theirs and that the network takes it), and
// one button. The answer is said in words, and a payout asked for shows as waiting without a reload.
export function PayoutClaim({
  api: given,
  assetKey,
  wallets,
}: {
  readonly api?: ReferralsApi | undefined;
  readonly assetKey: string;
  readonly wallets: readonly string[];
}) {
  const api = useMemo(() => given ?? createReferralsApi(), [given]);
  const [wallet, setWallet] = useState(wallets[0] ?? "");
  const [working, setWorking] = useState(false);
  const [note, setNote] = useState<{
    readonly kind: "alert" | "status";
    readonly text: string;
  } | null>(null);
  const ask = async () => {
    setWorking(true);
    setNote(null);
    try {
      const answer = await api.requestPayout({
        assetKey,
        destination: wallet,
      });
      setNote(
        answer.status === "requested"
          ? {
              kind: "status",
              text: payoutWords.requested(unitsLabel(answer.amountUnits)),
            }
          : { kind: "alert", text: refusalCopy(answer) },
      );
    } catch {
      setNote({ kind: "alert", text: payoutWords.unreachable });
    } finally {
      setWorking(false);
    }
  };
  return (
    <form
      aria-label={payoutWords.heading}
      className="arcade-form"
      onSubmit={(event) => {
        event.preventDefault();
        void ask();
      }}
    >
      <ArcadeSelect
        label={payoutWords.walletLabel}
        onChange={setWallet}
        options={wallets.map((address) => ({ label: address, value: address }))}
        value={wallet}
      />
      <ArcadeActionButton busy={working} tone="mint" type="submit">
        {working ? payoutWords.asking : payoutWords.ask}
      </ArcadeActionButton>
      {note === null ? null : <p role={note.kind}>{note.text}</p>}
    </form>
  );
}
