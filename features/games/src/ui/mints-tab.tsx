"use client";

import type { GameClaim } from "@frostbite/shared/games";
import type { DockSection } from "@repo/ui/arcade";
import { type ReactNode, useState } from "react";

import { mintsCopy } from "../domain/mints-copy.ts";
import { ClaimsList } from "./claims-card.tsx";

type View = "everyone" | "mine";

// The one tab for mints: the player's own claims and everything the game has minted, with a switch between them when both are there. Whose
// mints are shown is the player's to choose; it starts on their own, which is what they came for.
export function MintsTab({
  everyone,
  mine,
}: {
  // The game's public gallery; absent where the game mints nothing.
  readonly everyone?: ReactNode;
  // The player's claims; absent where claims are not offered.
  readonly mine?: ReactNode;
}) {
  const [view, setView] = useState<View>(
    mine === undefined ? "everyone" : "mine",
  );
  const both = mine !== undefined && everyone !== undefined;
  return (
    <div className="mints-tab">
      {both ? (
        <div
          aria-label={mintsCopy.whose}
          className="mints-tab__switch"
          role="group"
        >
          {(["mine", "everyone"] as const).map((choice) => (
            <button
              aria-pressed={view === choice}
              key={choice}
              onClick={() => setView(choice)}
              type="button"
            >
              {mintsCopy[choice]}
            </button>
          ))}
        </div>
      ) : null}
      {view === "mine" ? mine : everyone}
    </div>
  );
}

// The dock section for mints, with how many claims the player has as its badge.
export function mintsDockSection({
  claims,
  everyone,
  onReview,
  titles,
}: {
  // The player's claims, where claims are offered.
  readonly claims: readonly GameClaim[] | undefined;
  readonly everyone: ReactNode | undefined;
  readonly onReview: (claimId: string) => void;
  readonly titles: Readonly<Record<string, string>>;
}): DockSection {
  return {
    badge:
      claims === undefined || claims.length === 0
        ? null
        : String(claims.length),
    content: (
      <MintsTab
        everyone={everyone}
        mine={
          claims === undefined ? undefined : (
            <ClaimsList claims={claims} onReview={onReview} titles={titles} />
          )
        }
      />
    ),
    id: "mints",
    label: mintsCopy.title,
  };
}
