import {
  defaultSound,
  parseSound,
  type SoundSettings,
} from "@frostbite/game-sdk/audio/settings";

import { maxLoops, stormDay } from "./rules/constants.ts";
import { scoreOf } from "./rules/heat.ts";
import { chapterDone, dayOneGoal } from "./rules/story.ts";
import { heroes } from "./rules/heroes.ts";
import type { DayState } from "./rules/types.ts";

// What the platform is asked to remember: the best day, the story day the player is on, the hero last chosen, whether the opening has
// been seen, whether Slip is unlocked, the Time Machine (whether it is open, how many trips back there have been, and how they have bent
// the timeline), the lantern wish sent up on the last story day, and the sound settings. Anything handed back is untrusted and is checked
// field by field.
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
  // The lantern wish (1 to 4) the last story day sent up, which the next one carries; 0 for none.
  readonly wish: number;
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
  wish: 0,
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
    wish: whole(fields.wish, 0, 4, 0),
  };
}

// The progress after a day: the best day kept, the next story day opened by a told day slept on, and Slip unlocked by playing the
// airdrop. The Time Machine opens when the statue takes the hero or the last day ends on SHA Beach; a trip back closes it, adds what it
// did to the timeline, and starts the story again from day one.
export function afterDay(
  progress: Progress,
  day: DayState,
): { readonly newBest: boolean; readonly progress: Progress } {
  const score = scoreOf(day);
  const trip = day.loop > 0;
  const won = day.cause === "beach";
  // A story day opens the next one when it is told and slept on: the first morning's goals, or the hero's beats.
  const told =
    day.cause === "home" &&
    (day.day === 1 ? dayOneGoal(day) === null : chapterDone(day));
  return {
    newBest: score > progress.best,
    progress: {
      ...progress,
      best: Math.max(progress.best, score),
      day: trip
        ? 1
        : told && day.day === progress.day
          ? Math.min(5, progress.day + 1)
          : progress.day,
      fate: trip
        ? Math.max(-99, Math.min(99, progress.fate + day.fate))
        : progress.fate,
      loops: Math.min(99, progress.loops + (trip ? 1 : 0)),
      machine: !trip && (progress.machine || won || day.cause === "machine"),
      slip: progress.slip || (day.day === stormDay && day.storm > 0),
      wish: trip ? 0 : day.wish,
    },
  };
}

// The day the first screen begins: a trip back to day one while the Time Machine is open, or the story day the player is on.
// A story day carries the timeline the trips back have left, as far as the rules take it, and last night's lantern wish.
export const nextRun = (
  progress: Progress,
): {
  readonly boon: number;
  readonly day: number;
  readonly fate: number;
  readonly loop: number;
} =>
  progress.machine
    ? {
        boon: 0,
        day: 1,
        fate: 0,
        loop: Math.min(maxLoops, progress.loops + 1),
      }
    : {
        boon: progress.wish,
        day: progress.day,
        fate: Math.max(-9, Math.min(9, progress.fate)),
        loop: 0,
      };
