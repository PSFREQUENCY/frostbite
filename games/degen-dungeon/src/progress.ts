import {
  defaultSound,
  parseSound,
  type SoundSettings,
} from "@frostbite/game-sdk/audio/settings";

import { stormDay } from "./rules/constants.ts";
import { heroes } from "./rules/heroes.ts";
import type { DayState } from "./rules/types.ts";

// What the platform is asked to remember: the best day, the story day the player is on, the hero last chosen, whether the opening has
// been seen, whether Slip is unlocked, and the sound settings. Anything handed back is untrusted and is checked field by field.
export interface Progress {
  readonly best: number;
  readonly day: number;
  readonly hero: number;
  readonly seen: boolean;
  readonly slip: boolean;
  readonly sound: SoundSettings;
}

export const freshProgress: Progress = {
  best: 0,
  day: 1,
  hero: 7,
  seen: false,
  slip: false,
  sound: defaultSound,
};

const whole = (
  value: unknown,
  low: number,
  high: number,
  otherwise: number,
): number =>
  typeof value === "number" &&
  Number.isInteger(value) &&
  value >= low &&
  value <= high
    ? value
    : otherwise;

export function restore(saved: unknown): Progress {
  if (typeof saved !== "object" || saved === null) return freshProgress;
  const fields: Readonly<Record<string, unknown>> = { ...saved };
  return {
    best: whole(fields.best, 0, Number.MAX_SAFE_INTEGER, 0),
    day: whole(fields.day, 1, 5, 1),
    hero: whole(fields.hero, 0, heroes.length - 1, freshProgress.hero),
    seen: fields.seen === true,
    slip: fields.slip === true,
    sound: parseSound(fields.sound),
  };
}

// The progress after a day: the best day kept, the next story day opened by a night at home, and Slip unlocked by playing the airdrop.
export function afterDay(
  progress: Progress,
  day: DayState,
): { readonly newBest: boolean; readonly progress: Progress } {
  const score = day.made + day.storm;
  return {
    newBest: score > progress.best,
    progress: {
      ...progress,
      best: Math.max(progress.best, score),
      day:
        day.cause === "home" && day.day === progress.day
          ? Math.min(5, progress.day + 1)
          : progress.day,
      slip: progress.slip || (day.day === stormDay && day.storm > 0),
    },
  };
}
