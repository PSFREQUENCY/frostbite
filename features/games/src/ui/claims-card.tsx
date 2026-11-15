import type { GameClaim } from "@frostbite/shared/games";
import { ArcadeActionButton } from "@repo/ui/arcade";

import { claimCopy, showsDelayed } from "../domain/claim-copy.ts";

// The player's claims for this game, one short row each: what it is, where it stands, and a way back to its review. No pictures: the
// minted picture is on the player's own shelf, and the row stays the same height whatever the claim.
export function ClaimsList({
  claims,
  onReview,
  titles,
}: {
  readonly claims: readonly GameClaim[];
  readonly onReview: (claimId: string) => void;
  readonly titles: Readonly<Record<string, string>>;
}) {
  return claims.length === 0 ? (
    <p>You have not claimed anything from this game.</p>
  ) : (
    <ul aria-label="Claims of this game" className="mints-list">
      {claims.map((claim) => (
        <li
          data-claim-state={claim.state}
          data-delayed={showsDelayed(claim) ? "true" : undefined}
          key={claim.id}
        >
          <span className="mints-list__name">
            <strong>{titles[claim.milestoneId] ?? claim.milestoneId}</strong>
            <small>{claimCopy(claim).label}</small>
          </span>
          <ArcadeActionButton
            ariaLabel={`Details of ${titles[claim.milestoneId] ?? claim.milestoneId}`}
            onClick={() => onReview(claim.id)}
            size="small"
            tone="cyan"
          >
            Details
          </ArcadeActionButton>
        </li>
      ))}
    </ul>
  );
}
