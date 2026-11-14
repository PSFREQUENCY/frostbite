import { ExplorerBoundary } from "@frostbite/feature-chain-status/transaction";
import type { NavigationItem } from "@frostbite/plugin-kit/navigation";
import type { Payout } from "@frostbite/rewards";
import type { ReferralBatch } from "@frostbite/shared/referrals";
import {
  ArcadeBadge,
  ArcadeEmptyState,
  ConsoleCard,
  ConsoleRow,
} from "@repo/ui/arcade";

import type { ReferralsApi } from "../client/api.ts";
import {
  batchStateWords,
  payoutsWords,
  settledBatch,
} from "../domain/batch-copy.ts";
import { historyWords } from "../domain/copy.ts";
import { unitsLabel, whenLabel } from "../domain/format.ts";
import { AdminFrame } from "./frames.tsx";
import { PayoutsWallet } from "./payouts-wallet.tsx";

// `/admin/referrals/payouts` (staff): the payouts waiting for a batch and the batch itself (build, sign, send, follow to the chain), then the
// batches there have been. Payouts are for staff to sign with their own wallet; the platform checks what was signed against what was built.
export function AdminPayouts({
  api,
  batches,
  explorerTxUrl,
  names,
  navigation,
  queue,
  served,
  signingWallets,
}: {
  readonly api?: ReferralsApi | undefined;
  // Newest first; the one in progress, if there is one, is the first that is not over.
  readonly batches: readonly ReferralBatch[];
  readonly explorerTxUrl: string;
  // Who each referrer is, by account id.
  readonly names: ReadonlyMap<string, string>;
  readonly navigation: readonly NavigationItem[];
  // The payouts that are not over, oldest first.
  readonly queue: readonly Payout[];
  // Whether the platform serves a network it can pay on.
  readonly served: boolean;
  readonly signingWallets: readonly string[];
}) {
  const waiting = queue.filter(({ state }) => state === "requested");
  const assets = [...new Set(waiting.map(({ assetKey }) => assetKey))];
  const open = batches.find(({ state }) => !settledBatch(state)) ?? null;
  return (
    <AdminFrame
      current="payouts"
      heading={payoutsWords.heading}
      intro={payoutsWords.intro}
      navigation={navigation}
    >
      <ConsoleCard glyph="⇢" title="Pay a batch" wide>
        {!served ? (
          <p>{payoutsWords.noChain}</p>
        ) : (
          <ExplorerBoundary txUrl={explorerTxUrl}>
            <PayoutsWallet
              api={api}
              assets={assets}
              initial={open}
              signingWallets={signingWallets}
            />
          </ExplorerBoundary>
        )}
      </ConsoleCard>
      <ConsoleCard glyph="☰" title={payoutsWords.queue} wide>
        {queue.length === 0 ? (
          <ArcadeEmptyState title="Nothing waiting">
            {payoutsWords.emptyQueue}
          </ArcadeEmptyState>
        ) : (
          <ul className="console-list">
            {queue.map((payout) => (
              <ConsoleRow
                action={
                  <ArcadeBadge
                    tone={payout.state === "requested" ? "yellow" : "cyan"}
                  >
                    {historyWords.payoutStates[payout.state]}
                  </ArcadeBadge>
                }
                detail={`${whenLabel(payout.createdAt)} · to ${payout.destination}`}
                key={payout.id}
                name={`${unitsLabel(payout.amount)} · ${names.get(payout.beneficiaryId) ?? "unknown"}`}
              />
            ))}
          </ul>
        )}
      </ConsoleCard>
      <ConsoleCard glyph="⇠" title="Batches" wide>
        {batches.length === 0 ? (
          <p>{payoutsWords.historyEmpty}</p>
        ) : (
          <ul className="console-list">
            {batches.map((batch) => (
              <ConsoleRow
                action={
                  <ArcadeBadge
                    tone={
                      batch.state === "complete"
                        ? "mint"
                        : settledBatch(batch.state)
                          ? "red"
                          : "yellow"
                    }
                  >
                    {batchStateWords[batch.state].label}
                  </ArcadeBadge>
                }
                detail={`${whenLabel(new Date(batch.createdAt))}${batch.transactionId === null ? "" : ` · ${batch.transactionId}`}`}
                key={batch.id}
                name={`${String(batch.payments.length)} ${batch.payments.length === 1 ? "payment" : "payments"}, ${unitsLabel(batch.totalUnits)}`}
              />
            ))}
          </ul>
        )}
      </ConsoleCard>
    </AdminFrame>
  );
}
