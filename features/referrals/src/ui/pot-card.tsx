import type { Mine } from "@frostbite/referrals";
import type { ReferralProgram } from "@frostbite/referrals";
import { referralsHistoryPath } from "@frostbite/shared/referrals";
import type { Payout } from "@frostbite/rewards";
import { ArcadeButton, ArcadeProgress, ConsoleCard } from "@repo/ui/arcade";

import { mineWords, payoutWords, stateWords } from "../domain/copy.ts";
import { unitsLabel } from "../domain/format.ts";
import type { ReferralsApi } from "../client/api.ts";
import { PayoutClaim } from "./payout-claim.tsx";

// The one number a referrer came for: what is ready to be paid, with what is still waiting under it and the way to the minimum. A person who
// has earned in no asset sees the pot as nothing, in the same place, so the page does not change shape when the first earning arrives.
export function PotCard({
  api,
  frozen,
  open,
  pots,
  program,
  wallets,
}: {
  readonly api?: ReferralsApi | undefined;
  readonly frozen: boolean;
  // Payouts asked for and not over, and the wallets of the account a payout may go to.
  readonly open: readonly Payout[];
  readonly wallets: readonly string[];
  readonly pots: Mine["pots"];
  readonly program: ReferralProgram | null;
}) {
  const shown = pots.length === 0 ? [null] : pots;
  const minimum = program?.minimumPayout ?? 0n;
  return (
    <ConsoleCard
      glyph="◆"
      lead={frozen ? stateWords.frozen : undefined}
      title={mineWords.potHeading}
      wide
    >
      {shown.map((pot) => {
        const ready = pot?.payable ?? 0n;
        const waiting = pot?.maturing ?? 0n;
        const reached = ready > 0n && ready >= minimum;
        const inFlight = open.find(
          ({ assetKey }) => assetKey === pot?.assetKey,
        );
        return (
          <div className="ref-pot" key={pot?.assetKey ?? "none"}>
            <p className="ref-pot__figure">
              <strong>{unitsLabel(ready)}</strong>
              <span>ready to be paid</span>
            </p>
            <ul className="ref-pot__facts">
              <li>{`${unitsLabel(waiting)} still waiting`}</li>
              <li>{`${unitsLabel(pot?.inFlight ?? 0n)} in a payout`}</li>
              <li>{`${unitsLabel(pot?.paid ?? 0n)} paid so far`}</li>
            </ul>
            {inFlight === undefined ? null : (
              <p role="status">
                {inFlight.state === "requested"
                  ? payoutWords.waitingForBatch(unitsLabel(inFlight.amount))
                  : payoutWords.inBatch(unitsLabel(inFlight.amount))}
              </p>
            )}
            {inFlight !== undefined || pot === null ? null : reached ? (
              <>
                <p>{mineWords.readyToClaim}</p>
                {wallets.length === 0 ? (
                  <>
                    <p>{payoutWords.linkWallet}</p>
                    <ArcadeButton href="/account">
                      {payoutWords.linkWalletAction}
                    </ArcadeButton>
                  </>
                ) : (
                  <PayoutClaim
                    api={api}
                    assetKey={pot.assetKey}
                    wallets={wallets}
                  />
                )}
              </>
            ) : minimum === 0n ? null : (
              <>
                <ArcadeProgress
                  label="Progress to the minimum payout"
                  value={Number((ready * 1000n) / minimum) / 1000}
                />
                <p>{mineWords.progress(ready, minimum)}</p>
              </>
            )}
          </div>
        );
      })}
      <ArcadeButton href={referralsHistoryPath}>See every earning</ArcadeButton>
    </ConsoleCard>
  );
}
