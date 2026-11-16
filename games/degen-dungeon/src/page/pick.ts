import type { Guide } from "@frostbite/game-sdk/guide";
import { isTouchScreen } from "@frostbite/game-sdk/touch";

import { element } from "./elements.ts";

// The hero ring's card, once a run has started and before a hero wakes: the hero's name and stats and how to choose and wake, in
// words over the picture (the platform's own card is put away once a run starts). It takes no touches; they go to the screen.
export interface Pick {
  show(guide: Guide | null): void;
}

export function createPick(): Pick {
  const box = element("pick", "div");
  const name = element("pick-name", "p");
  const lines = element("pick-lines", "p");
  const start = element("pick-start", "p");
  return {
    show(guide) {
      box.hidden = guide === null;
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
