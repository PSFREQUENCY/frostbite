import {
  defaultSound,
  parseSound,
  type SoundSettings,
} from "@frostbite/game-sdk/audio/settings";

import { maxLoops, stormDay } from "./rules/constants.ts";
import { scoreOf } from "./rules/heat.ts";
import { heroes } from "./rules/heroes.ts";
import type { DayState } from "./rules/types.ts";

// What the platform is asked to remember: the best day, the story day the player is on, the hero last chosen, whether the opening has
// been seen, whether Slip is unlocked, the Time Machine (whether it is open, how many trips back there have been, and how they have bent
// the timeline), and the sound settings. Anything handed back is untrusted and is checked field by field.
export interface Progress {
  readonly best: number;
  readonly day: number;
  readonly fate: number;
  readonly hero: number;
  readonly loops: number;
  // Whether the Time Machine is open: the next day is a trip back to day one.
  readonly machine: boolean;
  readonly seen: boolean;
  readonly slip: boolean;
  readonly sound: SoundSettings;
}

export const freshProgress: Progress = {
  best: 0,
  day: 1,
  fate: 0,
  hero: 7,
  loops: 0,
  machine: false,
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
    fate: whole(fields.fate, -99, 99, 0),
    hero: whole(fields.hero, 0, heroes.length - 1, freshProgress.hero),
    loops: whole(fields.loops, 0, 99, 0),
    machine: fields.machine === true,
    seen: fields.seen === true,
    slip: fields.slip === true,
    sound: parseSound(fields.sound),
  };
}

// The progress after a day: the best day kept, the next story day opened by a night at home, and Slip unlocked by playing the airdrop. The
// Time Machine opens when the statue takes the hero or the last day ends at home; a trip back closes it, adds what it did to the timeline,
// and starts the story again from day one.
export function afterDay(
  progress: Progress,
  day: DayState,
): { readonly newBest: boolean; readonly progress: Progress } {
  const score = scoreOf(day);
  const trip = day.loop > 0;
  const won = day.cause === "home" && day.day === 5;
  return {
    newBest: score > progress.best,
    progress: {
      ...progress,
      best: Math.max(progress.best, score),
      day: trip
        ? 1
        : day.cause === "home" && day.day === progress.day
          ? Math.min(5, progress.day + 1)
          : progress.day,
      fate: Math.max(-99, Math.min(99, progress.fate + day.fate)),
      loops: Math.min(99, progress.loops + (trip ? 1 : 0)),
      machine: !trip && (progress.machine || won || day.cause === "machine"),
      slip: progress.slip || (day.day === stormDay && day.storm > 0),
    },
  };
}

// The day the first screen begins: a trip back to day one while the Time Machine is open, or the story day the player is on.
export const nextRun = (
  progress: Progress,
): { readonly day: number; readonly loop: number } =>
  progress.machine
    ? { day: 1, loop: Math.min(maxLoops, progress.loops + 1) }
    : { day: progress.day, loop: 0 };
