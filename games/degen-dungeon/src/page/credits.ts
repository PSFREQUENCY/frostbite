import { creditTitles, creditsSkip } from "../script/credits.ts";
import { opening } from "../view/cine.ts";
import { element } from "./elements.ts";

// The opening credits, before the hero ring: the first-screen card over the block of ice for a moment, then the opening's camera moves
// over the city with the credits letterboxed across the picture (the card put away so it shows), and then the ring. Enter or a tap in
// the middle starts a day at any point; the arrows or a tap on a side go straight to the ring. A page with no 3D has no credits.
export interface Credits {
  // Whether the credits are on, and whether they are past the title (so the card is put away).
  on(): boolean;
  flying(): boolean;
  // Moves the credits on by `dt` seconds and draws them with `draw`, the opening at a time; null from it means the opening is over.
  frame(dt: number, draw: (seconds: number) => string | null): void;
  stop(): void;
}

export const titleHold = 2.5;
// Which of the opening's shots a time into it falls in.
export const shotAt = (seconds: number): number => {
  let start = 0;
  for (const [index, shot] of opening.entries()) {
    start += shot.seconds;
    if (seconds < start) return index;
  }
  return opening.length - 1;
};

export function createCredits(enabled: boolean): Credits {
  const box = element("clip", "div");
  const title = element("clip-title", "p");
  const line = element("clip-line", "p");
  const skip = element("clip-skip", "p");
  const usual = skip.textContent;
  let clock: number | null = enabled ? 0 : null;
  const stop = (): void => {
    if (clock === null) return;
    clock = null;
    box.hidden = true;
    box.classList.remove("credits");
    skip.textContent = usual;
  };
  return {
    flying: () => clock !== null && clock >= titleHold,
    frame(dt, draw) {
      if (clock === null) return;
      clock += dt;
      const into = Math.max(0, clock - titleHold);
      const caption = draw(into);
      if (caption === null) return stop();
      if (clock < titleHold) return;
      box.hidden = false;
      box.classList.add("credits");
      title.textContent = creditTitles[shotAt(into)] ?? "";
      line.textContent = caption;
      skip.textContent = creditsSkip;
    },
    on: () => clock !== null,
    stop,
  };
}
