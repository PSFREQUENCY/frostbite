import type { Guide } from "@frostbite/game-sdk/guide";
import { isTouchScreen } from "@frostbite/game-sdk/touch";

import { element } from "./elements.ts";

// The hero ring's card, once a run has started and before a hero wakes: the hero's name and stats and how to choose and wake, in
// words over the picture (the platform's own card is put away once a run starts). The card takes no touches; they go to the screen.
// Two round arrows on the picture's sides turn the ring too. They are always in their places, unseen until the ring is up, so nothing
// moves when a run starts.
export interface Pick {
  show(guide: Guide | null): void;
}

export function createPick(turn: (by: number) => void): Pick {
  const box = element("pick", "div");
  const name = element("pick-name", "p");
  const lines = element("pick-lines", "p");
  const start = element("pick-start", "p");
  element("prev", "button").addEventListener("click", () => turn(-1));
  element("next", "button").addEventListener("click", () => turn(1));
  return {
    show(guide) {
      box.hidden = guide === null;
      document.body.dataset.ring = guide === null ? "no" : "yes";
      if (guide === null) return;
      const touch = isTouchScreen();
      const [first = "", ...rest] =
        (touch ? guide.touchLines : undefined) ?? guide.lines;
      name.textContent = first;
      lines.textContent = rest.join("\n");
      start.textContent = (touch ? guide.touchStart : undefined) ?? guide.start;
    },
  };
}
