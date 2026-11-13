import type { DayState } from "../rules/types.ts";
import type { Choice } from "../session.ts";
import type { Hands } from "./controls.ts";
import { element } from "./elements.ts";
import { createSteer } from "./steer.ts";

// What the player's hands do during a day, given the page's pieces: the act button says yes to what waits or uses the nearest spot; Space
// jumps (or says yes); Shift held runs, and C and Z switch crouching and crawling on and off; the arrows steer by the camera; an answer to
// the lantern carries the message typed beside it up on the hero's lantern.
export interface Page {
  readonly answers: (day: DayState) => number;
  readonly bag: () => void;
  readonly choose: (choice: Choice) => void;
  readonly day: () => DayState | null;
  readonly jump: () => void;
  readonly pause: () => void;
  readonly running: () => boolean;
  readonly start: () => void;
  readonly tapStart: () => void;
  readonly turn: (by: number) => void;
  // The message the player wrote for the lantern, put on the hero's lantern when a wish is picked.
  readonly wish: (text: string) => void;
  readonly wishText: () => string;
  readonly yaw: () => number;
}

export function handsFor(page: Page): Hands {
  const asked = (): boolean => {
    const day = page.day();
    return day !== null && day.talk !== null;
  };
  const answer = (choice: number): void => {
    const day = page.day();
    if (day?.talk === "lantern" && choice < 4) page.wish(page.wishText());
    page.choose({ choice, type: "pick" });
  };
  const steer = createSteer(page.yaw, (dir) =>
    page.choose({ dir, type: "move" }),
  );
  return {
    act: () => {
      if (!page.running()) return;
      if (asked()) answer(0);
      else page.choose({ type: "act" });
    },
    answer,
    bag: page.bag,
    gait(mode, held) {
      const day = page.day();
      if (day === null) return;
      const want =
        held === undefined
          ? day.gait === mode
            ? 0
            : mode
          : held
            ? mode
            : day.gait === mode
              ? 0
              : day.gait;
      if (want !== day.gait) page.choose({ mode: want, type: "gait" });
    },
    jump: () => {
      if (!page.running()) return;
      if (asked()) answer(0);
      else page.jump();
    },
    lift: (by) => page.choose({ by, type: "lift" }),
    look: () => page.choose({ type: "look" }),
    move: steer,
    no: () => {
      const day = page.day();
      answer(day === null ? 1 : page.answers(day) - 1);
    },
    pause: page.pause,
    start: page.start,
    tapStart: page.tapStart,
    turn: page.turn,
  };
}

// The buttons under the screen; the ones that only make sense during a day come back, to be switched on and off with it.
export function wireButtons(hands: Hands): readonly HTMLButtonElement[] {
  const press = (id: string, does: () => void): HTMLButtonElement => {
    const button = element(id, "button");
    button.addEventListener("click", does);
    return button;
  };
  press("look", hands.look);
  press("up", () => hands.lift(1));
  press("down", () => hands.lift(-1));
  return [
    press("act", hands.act),
    press("pause", hands.pause),
    press("jump", hands.jump),
    press("run", () => hands.gait(1)),
    press("duck", () => hands.gait(2)),
    press("crawl", () => hands.gait(3)),
    press("pack", hands.bag),
  ];
}
