import type { DockSection } from "@repo/ui/arcade";
import type { ReactNode } from "react";

import { milestonesSection } from "./milestones-section.tsx";
import { mintsDockSection } from "./mints-tab.tsx";
import { walletDockSection } from "./wallet-section.tsx";

type MilestonesInput = Parameters<typeof milestonesSection>[0];

// The sections of a game's dock, in the order a player on a phone reaches them without scrolling the strip: the milestones, the sections that
// come right after them (the leaderboard), the mints (the player's own claims and the game's public gallery, one tab), the wallet, then the
// page's own (about, what it asks for). A section appears only where there is something to show in it.
export function gameDock({
  claimUi,
  claims,
  gallery,
  game,
  lead,
  progress,
  sections,
  share,
  title,
  titles,
  unlocked,
  wallet,
}: {
  readonly claimUi: MilestonesInput["claimUi"];
  readonly claims: MilestonesInput["claims"];
  // The game's public gallery of mints; absent where the game mints nothing.
  readonly gallery: ReactNode | undefined;
  readonly game: MilestonesInput["game"];
  readonly lead: readonly DockSection[];
  readonly progress: MilestonesInput["progress"];
  readonly sections: readonly DockSection[];
  readonly share: MilestonesInput["share"];
  readonly title: string;
  readonly titles: Readonly<Record<string, string>>;
  readonly unlocked: MilestonesInput["unlocked"];
  readonly wallet: Parameters<typeof walletDockSection>[0] | undefined;
}): DockSection[] {
  return [
    ...(game.milestones.length === 0
      ? []
      : [
          milestonesSection({
            claimUi,
            claims,
            game,
            progress,
            share,
            title,
            unlocked,
          }),
        ]),
    ...lead,
    ...(claims === undefined && gallery === undefined
      ? []
      : [
          mintsDockSection({
            claims: claims === undefined ? undefined : claimUi.claims,
            everyone: gallery,
            onReview: claimUi.reopen,
            titles,
          }),
        ]),
    ...(wallet === undefined ? [] : [walletDockSection(wallet)]),
    ...sections,
  ];
}
