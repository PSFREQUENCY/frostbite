"use client";

import type { ReferralCoverResponse } from "@frostbite/shared/referrals";
import { ArcadeActionButton } from "@repo/ui/arcade";
import { useState } from "react";

import type { ReferralsApi } from "../client/api.ts";
import { coverLine, coverWords } from "../domain/batch-copy.ts";

// Before a batch is built: what the wallet that would pay holds against what is waiting in the asset. It looks when asked and says what it
// found; it never stands in for the build, which asks the network again and refuses a wallet that cannot pay.
export function CoverCheck({
  api,
  assetKey,
  wallet,
}: {
  readonly api: ReferralsApi;
  readonly assetKey: string;
  readonly wallet: string;
}) {
  const [answer, setAnswer] = useState<
    ReferralCoverResponse | "unreachable" | null
  >(null);
  const [looking, setLooking] = useState(false);
  const look = async () => {
    setLooking(true);
    try {
      setAnswer(await api.cover({ assetKey, wallet: wallet.trim() }));
    } catch {
      setAnswer("unreachable");
    } finally {
      setLooking(false);
    }
  };
  const text =
    answer === null
      ? null
      : answer === "unreachable"
        ? coverWords.unreachable
        : answer.status === "refused"
          ? coverWords.refused[answer.reason]
          : answer.payments === 0
            ? coverWords.nothingWaiting
            : coverLine(answer);
  return (
    <div className="ref-cover">
      <ArcadeActionButton
        busy={looking}
        disabled={looking || assetKey === "" || wallet.trim() === ""}
        onClick={() => void look()}
      >
        {looking ? coverWords.checking : coverWords.check}
      </ArcadeActionButton>
      {text === null ? null : <p role="status">{text}</p>}
    </div>
  );
}
