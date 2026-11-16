import type { NavigationItem } from "@frostbite/plugin-kit/navigation";
import type { History } from "@frostbite/referrals";
import { referralsHistoryPath } from "@frostbite/shared/referrals";
import {
  ArcadeBadge,
  ArcadeEmptyState,
  ConsoleCard,
  ConsoleRow,
} from "@repo/ui/arcade";

import { historyWords, pageWords } from "../domain/copy.ts";
import { unitsLabel, whenLabel } from "../domain/format.ts";
import { UserFrame } from "./frames.tsx";

const tones = {
  "in-payout": "yellow",
  maturing: "yellow",
  paid: "mint",
  payable: "cyan",
  reversal: "pink",
} as const;

// `/referrals/history`: a person's earnings, newest first and a page at a time, and the payouts they asked for. It says when, how much and
// where each stands, and nothing about who minted or what (a referrer never learns that).
export function HistoryPage({
  history,
  navigation,
}: {
  readonly history: History;
  readonly navigation: readonly NavigationItem[];
}) {
  const { entries, payouts } = history;
  return (
    <UserFrame
      heading={pageWords.historyHeading}
      intro={pageWords.historyIntro}
      navigation={navigation}
    >
      <ConsoleCard glyph="☰" title={historyWords.earnings} wide>
        {entries.items.length === 0 ? (
          <ArcadeEmptyState title="No earnings yet">
            {historyWords.empty}
          </ArcadeEmptyState>
        ) : (
          <ul className="console-list">
            {entries.items.map((row) => (
              <ConsoleRow
                action={
                  <ArcadeBadge tone={tones[row.state]}>
                    {historyWords.states[row.state]}
                  </ArcadeBadge>
                }
                detail={whenLabel(row.at)}
                key={row.id}
                name={`${row.amount < 0n ? "−" : "+"}${unitsLabel(row.amount < 0n ? -row.amount : row.amount)}`}
              />
            ))}
          </ul>
        )}
        {entries.next === null ? null : (
          <a
            className="arcade-button arcade-button--cyan"
            href={`${referralsHistoryPath}?after=${encodeURIComponent(entries.next)}`}
          >
            {historyWords.older}
          </a>
        )}
      </ConsoleCard>
      {entries.items.length > 0 && payouts.length === 0 ? (
        <ConsoleCard glyph="⇢" title={historyWords.payouts}>
          <p>{historyWords.noPayouts}</p>
        </ConsoleCard>
      ) : null}
      {payouts.length === 0 ? null : (
        <ConsoleCard glyph="⇢" title={historyWords.payouts}>
          <ul className="console-list">
            {payouts.map((payout) => (
              <ConsoleRow
                action={
                  <ArcadeBadge
                    tone={payout.state === "failed" ? "red" : "mint"}
                  >
                    {historyWords.payoutStates[payout.state]}
                  </ArcadeBadge>
                }
                detail={whenLabel(payout.at)}
                key={payout.id}
                name={unitsLabel(payout.amount)}
              />
            ))}
          </ul>
        </ConsoleCard>
      )}
    </UserFrame>
  );
}
