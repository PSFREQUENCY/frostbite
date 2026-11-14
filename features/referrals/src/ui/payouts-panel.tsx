"use client";

import type { ReferralBatch } from "@frostbite/shared/referrals";
import {
  ActionProgress,
  ArcadeActionButton,
  ArcadeSignButton,
  ArcadeSelect,
  ArcadeTextField,
} from "@repo/ui/arcade";
import { useMemo, useState } from "react";

import { createReferralsApi, type ReferralsApi } from "../client/api.ts";
import { payoutsWords } from "../domain/batch-copy.ts";
import { BatchReview } from "./batch-review.tsx";
import { useBatch, type BatchSigner } from "./use-batch.ts";

// Where staff pay referrers: choose the asset waiting, say which wallet pays, build the batch, review it, sign it and watch it to its end. A
// batch already in progress is shown as it stands, so a page opened later (or by another staff member) picks it up.
export function PayoutsPanel({
  api: given,
  assets,
  connectedAddress = "",
  initial,
  pollMs,
  sign,
}: {
  readonly api?: ReferralsApi | undefined;
  // The assets that have payouts waiting, as the ledger's keys; the one to build for is chosen.
  readonly assets: readonly string[];
  // The wallet connected in the header, offered as the one that pays.
  readonly connectedAddress?: string;
  readonly initial: ReferralBatch | null;
  readonly pollMs?: number;
  readonly sign?: BatchSigner | undefined;
}) {
  const api = useMemo(() => given ?? createReferralsApi(), [given]);
  const state = useBatch({
    api,
    initial,
    ...(pollMs === undefined ? {} : { pollMs }),
    sign,
  });
  const [typed, setTyped] = useState<string | null>(null);
  const [chosen, setChosen] = useState(assets[0] ?? "");
  const [pasted, setPasted] = useState("");
  const wallet = typed ?? connectedAddress;
  const { batch } = state;

  if (batch !== null)
    return (
      <div className="ref-batch">
        <BatchReview
          batch={batch}
          canSign={state.canSign}
          message={state.message}
          onPaste={setPasted}
          pasted={pasted}
          skipped={state.skipped}
        />
        {batch.toSign === null ? (
          <ArcadeActionButton onClick={state.dismiss}>Close</ArcadeActionButton>
        ) : state.canSign ? (
          <ArcadeSignButton
            onClick={() => void state.send()}
            working={state.working}
          />
        ) : (
          <ArcadeActionButton
            disabled={state.working}
            onClick={() => void state.sendPasted(pasted)}
            tone="mint"
          >
            {state.working ? "Sending…" : "Send signed transaction"}
          </ArcadeActionButton>
        )}
      </div>
    );

  return (
    <form
      aria-label={payoutsWords.heading}
      className="arcade-form"
      onSubmit={(event) => {
        event.preventDefault();
        void state.build(chosen, wallet.trim());
      }}
    >
      {assets.length > 1 ? (
        <ArcadeSelect
          label="Asset to pay"
          onChange={setChosen}
          options={assets.map((asset) => ({ label: asset, value: asset }))}
          value={chosen}
        />
      ) : null}
      <ArcadeTextField
        autoComplete="off"
        hint={payoutsWords.walletHint}
        label={payoutsWords.walletLabel}
        maxLength={256}
        onChange={setTyped}
        value={wallet}
      />
      {state.working ? (
        <ActionProgress
          detail="Reading the network for its fees and building the transaction. Nothing is sent, and nothing is signed yet."
          title="Building the batch…"
        />
      ) : null}
      <ArcadeActionButton
        busy={state.working}
        disabled={assets.length === 0 || wallet.trim() === ""}
        tone="mint"
        type="submit"
      >
        {state.working ? payoutsWords.building : payoutsWords.build}
      </ArcadeActionButton>
      {state.message === null ? null : <p role="alert">{state.message}</p>}
      {state.skipped.length === 0 ? null : (
        <p className="ref-note">
          {`${String(state.skipped.length)} waiting payout(s) cannot be paid yet (under what the network relays, or to an address it does not accept).`}
        </p>
      )}
    </form>
  );
}
