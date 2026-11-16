// The notice that names a milestone the game has just reported. The element is always there, empty between notices, so a screen reader
// hears the words when they arrive. Where it is drawn is the player's to decide (see `game-player.tsx`): over the dock strip, below
// the game, or in full screen over the game as a small chip.
export function MilestoneToast({ text }: { readonly text: string | null }) {
  return (
    <div
      aria-live="polite"
      className="arcade-toast"
      data-testid="milestone-toast"
      role="status"
    >
      {text}
    </div>
  );
}
