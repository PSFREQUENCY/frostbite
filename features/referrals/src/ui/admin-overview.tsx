import type { NavigationItem } from "@frostbite/plugin-kit/navigation";
import type { Overview } from "@frostbite/referrals";
import { referralsAdminReferrersPath } from "@frostbite/shared/referrals";
import {
  ArcadeButton,
  ArcadeEmptyState,
  ConsoleCard,
  KeyValueList,
} from "@repo/ui/arcade";

import { overviewWords } from "../domain/admin-copy.ts";
import { unitsLabel } from "../domain/format.ts";
import { AdminFrame } from "./frames.tsx";

// `/admin/referrals`: the program in numbers. The totals are the ledger's own balances, by asset; checking them against the treasury is not
// done here, and the page says so rather than imply it.
export function AdminOverview({
  navigation,
  overview,
}: {
  readonly navigation: readonly NavigationItem[];
  readonly overview: Overview;
}) {
  const words = overviewWords.totals;
  return (
    <AdminFrame current="overview" navigation={navigation}>
      <ConsoleCard glyph="☺" title="People">
        <KeyValueList
          items={[
            {
              label: overviewWords.referrers,
              value: String(overview.referrers),
            },
            { label: overviewWords.referred, value: String(overview.referred) },
            { label: overviewWords.minted, value: String(overview.minted) },
            { label: overviewWords.frozen, value: String(overview.frozen) },
          ]}
          label="People in the program"
        />
        <ArcadeButton href={referralsAdminReferrersPath}>
          See the referrers
        </ArcadeButton>
      </ConsoleCard>
      <ConsoleCard glyph="◆" title={overviewWords.owedHeading}>
        {overview.assets.length === 0 ? (
          <ArcadeEmptyState title="Nothing owed yet">
            {overviewWords.noEarnings}
          </ArcadeEmptyState>
        ) : (
          overview.assets.map((asset) => (
            <KeyValueList
              items={[
                { label: words.owed, value: unitsLabel(asset.owed) },
                { label: words.payable, value: unitsLabel(asset.payable) },
                { label: words.maturing, value: unitsLabel(asset.maturing) },
                { label: words.inFlight, value: unitsLabel(asset.inFlight) },
                { label: words.paid, value: unitsLabel(asset.paid) },
                { label: "Asset", mono: true, value: asset.assetKey },
              ]}
              key={asset.assetKey}
              label={`Totals in ${asset.assetKey}`}
            />
          ))
        )}
        <p className="ref-note">{overviewWords.treasuryNote}</p>
      </ConsoleCard>
    </AdminFrame>
  );
}
