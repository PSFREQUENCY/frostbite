import type { Mine } from "@frostbite/referrals";
import type { ReferralProgram } from "@frostbite/referrals";
import { ArcadeProgress, ConsoleCard } from "@repo/ui/arcade";

import { mineWords, stateWords } from "../domain/copy.ts";
import { unitsLabel } from "../domain/format.ts";

// The one number a referrer came for: what is ready to be paid, with what is still waiting under it and the way to the minimum. A person who
// has earned in no asset sees the pot as nothing, in the same place, so the page does not change shape when the first earning arrives.
export function PotCard({
  frozen,
  pots,
  program,
}: {
  readonly frozen: boolean;
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
        const reached = minimum > 0n && ready >= minimum;
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
            {minimum === 0n ? null : (
              <>
                <ArcadeProgress
                  label="Progress to the minimum payout"
                  value={Number((ready * 1000n) / minimum) / 1000}
                />
                <p>
                  {reached
                    ? mineWords.readyToClaim
                    : mineWords.progress(ready, minimum)}
                </p>
              </>
            )}
          </div>
        );
      })}
    </ConsoleCard>
  );
}
