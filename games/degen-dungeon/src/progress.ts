import {
  defaultSound,
  parseSound,
  type SoundSettings,
} from "@frostbite/game-sdk/audio/settings";

import { eraOf, lastDay, moonNight, stormEra } from "./rules/calendar.ts";
import { maxLoops } from "./rules/constants.ts";
import { beamupsToday } from "./rules/invasion.ts";
import { scoreOf } from "./rules/heat.ts";
import { storyTold } from "./rules/story.ts";
import { heroes } from "./rules/heroes.ts";
import type { DayState } from "./rules/types.ts";

// What the platform is asked to remember: the best day, the story day the player is on, the hero the game is played with, whether that
// hero has been chosen, whether Slip is unlocked, whether the story has been won (a last day ended on SHA Beach), the Time Machine
// (whether it is open, how many trips back there have been, and how they have bent the timeline), the lantern wish sent up on the last
// story day, and the sound settings. Anything handed back is untrusted and is checked field by field.
export interface Progress {
  // Beam-ups with the visitors over all the days played (`invasion.ts`); thirteen leave the hero a saucer.
  readonly beamups: number;
  readonly best: number;
  readonly day: number;
  // Moon Night's dream (1 or 2), which the last day's beach ending tells; 0 before it is dreamt.
  readonly dream: number;
  readonly fate: number;
  readonly hero: number;
  // Whether the player has made a Nakasato ID at the kiosk (`stores.ts`), which every story day after carries.
  readonly idCard: boolean;
  readonly loops: number;
  // Whether the Time Machine is open: the next day is a trip back to day one.
  readonly machine: boolean;
  readonly seen: boolean;
  readonly slip: boolean;
  readonly sound: SoundSettings;
  // The lantern wish (1 to 4) the last story day sent up, which the next one carries; 0 for none.
  readonly wish: number;
  readonly won: boolean;
}

export const freshProgress: Progress = {
  beamups: 0,
  best: 0,
  day: 1,
  dream: 0,
  fate: 0,
  hero: 7,
  idCard: false,
  loops: 0,
  machine: false,
  seen: false,
  slip: false,
  sound: defaultSound,
  wish: 0,
  won: false,
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
    beamups: whole(fields.beamups, 0, 99, 0),
    day: whole(fields.day, 1, lastDay, 1),
    dream: whole(fields.dream, 0, 2, 0),
    fate: whole(fields.fate, -99, 99, 0),
    hero: whole(fields.hero, 0, heroes.length - 1, freshProgress.hero),
    idCard: fields.idCard === true,
    loops: whole(fields.loops, 0, 99, 0),
    machine: fields.machine === true,
    seen: fields.seen === true,
    slip: fields.slip === true,
    sound: parseSound(fields.sound),
    wish: whole(fields.wish, 0, 4, 0),
    won: fields.won === true,
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
  // A story day opens the next one when its three quests are done and it is slept on.
  const told = day.cause === "home" && storyTold(day);
  return {
    newBest: score > progress.best,
    progress: {
      ...progress,
      best: Math.max(progress.best, score),
      // Taken up by the saucers, the hero wakes at the start of the story again.
      day:
        trip || day.cause === "abducted"
          ? 1
          : told && day.day === progress.day
            ? Math.min(lastDay, progress.day + 1)
            : progress.day,
      beamups: Math.min(99, progress.beamups + beamupsToday(day)),
      dream:
        trip || day.cause === "abducted"
          ? 0
          : day.day === moonNight && day.dream > 0
            ? day.dream
            : progress.dream,
      fate: trip
        ? Math.max(-99, Math.min(99, progress.fate + day.fate))
        : progress.fate,
      idCard: progress.idCard || day.idCard,
      loops: Math.min(99, progress.loops + (trip ? 1 : 0)),
      machine: !trip && (progress.machine || won || day.cause === "machine"),
      slip: progress.slip || (eraOf(day.day) === stormEra && day.storm > 0),
      wish: trip || day.cause === "abducted" ? 0 : day.wish,
      won: progress.won || won,
    },
  };
}

// Whether the next run offers the hero ring: the first day of a game, before a hero is chosen, and every day once the story is won.
// Until then the game is played with the one hero chosen at its start.
export const choosing = (progress: Progress): boolean =>
  !progress.seen || progress.won;

// The day the first screen begins: a trip back to day one while the Time Machine is open, or the story day the player is on.
// A story day carries the timeline the trips back have left, as far as the rules take it, last night's lantern wish and the player's ID.
export const nextRun = (
  progress: Progress,
): {
  readonly beamups: number;
  readonly boon: number;
  readonly day: number;
  readonly dream: number;
  readonly fate: number;
  readonly idCard: boolean;
  readonly loop: number;
  readonly won: boolean;
} =>
  progress.machine
    ? {
        beamups: progress.beamups,
        boon: 0,
        day: 1,
        dream: 0,
        fate: 0,
        idCard: false,
        loop: Math.min(maxLoops, progress.loops + 1),
        won: progress.won,
      }
    : {
        beamups: progress.beamups,
        boon: progress.wish,
        day: progress.day,
        dream: progress.day === lastDay ? progress.dream : 0,
        fate: Math.max(-9, Math.min(9, progress.fate)),
        idCard: progress.idCard,
        loop: 0,
        won: progress.won,
      };
