import type { NavigationItem } from "@frostbite/plugin-kit/navigation";
import type { ReferrerDetail } from "@frostbite/referrals";
import { referralsAdminReferrersPath } from "@frostbite/shared/referrals";
import {
  ArcadeBadge,
  ArcadeButton,
  ArcadeEmptyState,
  ConsoleCard,
  ConsoleRow,
  KeyValueList,
} from "@repo/ui/arcade";

import type { ReferralsApi } from "../client/api.ts";
import { referrerWords } from "../domain/admin-copy.ts";
import { historyWords } from "../domain/copy.ts";
import { unitsLabel, whenLabel } from "../domain/format.ts";
import { FreezeForm } from "./freeze-form.tsx";
import { AdminFrame, canAdminister } from "./frames.tsx";

const tones = {
  "in-payout": "yellow",
  maturing: "yellow",
  paid: "mint",
  payable: "cyan",
  reversal: "pink",
} as const;

// One earning followed to the mint behind it: the game and milestone, and the claim's id, so a figure can be traced to what earned it.
const claimLine = (
  claim: ReferrerDetail["earnings"]["items"][number]["claim"],
) =>
  claim === null
    ? "Not from a claim"
    : `${claim.gameId} · ${claim.milestoneId} · claim ${claim.claimId}`;

// `/admin/referrals/referrers/<id>`: one referrer whole. For staff, who may see who a person is. Pausing is for administrators, so the form is
// shown only to someone who also has the Program section (the server refuses everyone else whatever the page shows).
export function ReferrerPage({
  api,
  detail,
  navigation,
  older,
}: {
  readonly api?: ReferralsApi | undefined;
  readonly detail: ReferrerDetail;
  readonly navigation: readonly NavigationItem[];
  // Where the next page of earnings is, when there is one.
  readonly older: string | null;
}) {
  return (
    <AdminFrame
      current="referrers"
      heading={detail.name}
      intro="Their earnings, each one followed to the mint behind it, their payouts, and whether earning is paused."
      navigation={navigation}
    >
      <ConsoleCard glyph="☺" title="Summary">
        <KeyValueList
          items={[
            { label: "Account", mono: true, value: detail.referrerId },
            { label: "Referral code", mono: true, value: detail.code },
            { label: "Signed up", value: String(detail.signedUp) },
            { label: "Of those, minted", value: String(detail.minted) },
            {
              label: "Earning",
              value: (
                <ArcadeBadge tone={detail.frozen ? "red" : "mint"}>
                  {detail.frozen ? "Paused" : "On"}
                </ArcadeBadge>
              ),
            },
          ]}
          label="About this referrer"
        />
        <ArcadeButton href={referralsAdminReferrersPath}>
          All referrers
        </ArcadeButton>
      </ConsoleCard>
      <ConsoleCard glyph="◆" title="Pot">
        {detail.pots.length === 0 ? (
          <p>Nothing earned yet.</p>
        ) : (
          detail.pots.map((pot) => (
            <KeyValueList
              items={[
                { label: "Ready", value: unitsLabel(pot.payable) },
                { label: "Waiting", value: unitsLabel(pot.maturing) },
                { label: "In a payout", value: unitsLabel(pot.inFlight) },
                { label: "Paid", value: unitsLabel(pot.paid) },
                { label: "Asset", mono: true, value: pot.assetKey },
              ]}
              key={pot.assetKey}
              label={`Pot in ${pot.assetKey}`}
            />
          ))
        )}
      </ConsoleCard>
      <ConsoleCard glyph="☰" title={historyWords.earnings} wide>
        {detail.earnings.items.length === 0 ? (
          <ArcadeEmptyState title="No earnings yet">
            {historyWords.empty}
          </ArcadeEmptyState>
        ) : (
          <ul className="console-list">
            {detail.earnings.items.map((earning) => (
              <ConsoleRow
                action={
                  <ArcadeBadge tone={tones[earning.state]}>
                    {historyWords.states[earning.state]}
                  </ArcadeBadge>
                }
                detail={`${whenLabel(earning.at)} · ${claimLine(earning.claim)}`}
                key={earning.id}
                name={`${earning.amount < 0n ? "−" : "+"}${unitsLabel(earning.amount < 0n ? -earning.amount : earning.amount)}`}
              />
            ))}
          </ul>
        )}
        {older === null ? null : (
          <a className="arcade-button arcade-button--cyan" href={older}>
            {historyWords.older}
          </a>
        )}
      </ConsoleCard>
      <ConsoleCard glyph="⇢" title={historyWords.payouts}>
        {detail.payouts.length === 0 ? (
          <p>{historyWords.noPayouts}</p>
        ) : (
          <ul className="console-list">
            {detail.payouts.map((payout) => (
              <ConsoleRow
                action={
                  <ArcadeBadge
                    tone={payout.state === "failed" ? "red" : "mint"}
                  >
                    {historyWords.payoutStates[payout.state]}
                  </ArcadeBadge>
                }
                detail={`${whenLabel(payout.createdAt)} · to ${payout.destination}`}
                key={payout.id}
                name={unitsLabel(payout.amount)}
              />
            ))}
          </ul>
        )}
      </ConsoleCard>
      <ConsoleCard
        glyph="⏸"
        lead={detail.frozen ? referrerWords.frozenNow : undefined}
        title={referrerWords.history}
      >
        {detail.freezes.length === 0 ? (
          <p>{referrerWords.historyEmpty}</p>
        ) : (
          <ul className="console-list">
            {detail.freezes.map((freeze) => (
              <ConsoleRow
                detail={`${whenLabel(freeze.createdAt)} · ${freeze.reason}`}
                key={`${freeze.createdAt.toISOString()}-${freeze.reason}`}
                name={freeze.frozen ? "Paused" : "Resumed"}
              />
            ))}
          </ul>
        )}
        {canAdminister(navigation) ? (
          <FreezeForm
            api={api}
            frozen={detail.frozen}
            referrerId={detail.referrerId}
          />
        ) : null}
      </ConsoleCard>
    </AdminFrame>
  );
}
