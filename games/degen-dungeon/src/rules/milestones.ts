import { moments } from "./machine.ts";
import { masksWorn } from "./statues.ts";
import { questDone, type Quest } from "./story.ts";
import type { DayState } from "./types.ts";

// Every milestone this game can earn, each decided by the state of a day alone (so a replay can decide it too). The ids are the ones in
// the game's manifest, which holds their words. No two are earned by the same event. In three sets: one for each of the story's twenty
// quests (two on the first morning, then three a day), ten for the top skills, and the top achievements, most of them hidden ones to
// stumble on. A draft for the owner.
const has = (day: DayState, ...names: readonly string[]): boolean =>
  names.some((name) => day.done.includes(name));
// How many kinds of ride the hero took from the kerb today, not counting a semi's cab.
const kindsTaken = (day: DayState): number =>
  new Set(
    day.done.flatMap((id) => {
      const kind = /^(bike|car|moto|scooter|truck|van)-\d+$/u.exec(id)?.[1];
      return kind === undefined ? [] : [kind];
    }),
  ).size;

// The story's quests, by day: a quest's milestone is earned by doing it on its own day.
const quests: readonly (readonly [string, number, Quest])[] = [
  ["heard-frost", 1, "speech"],
  ["seed-paper", 1, "paper"],
  ["first-gig", 2, "gig"],
  ["green-line", 2, "ride"],
  ["first-trade", 2, "trade"],
  ["caught-the-mania", 3, "beat-0"],
  ["riding-the-pump", 3, "beat-1"],
  ["hustle", 3, "beat-2"],
  ["cold-open", 4, "beat-0"],
  ["thin-ice", 4, "beat-1"],
  ["crew-up", 4, "beat-2"],
  ["countdown", 5, "beat-0"],
  ["liftoff", 5, "beat-1"],
  ["big-play", 5, "beat-2"],
  ["dream", 6, "beat-0"],
  ["moon-party", 6, "beat-1"],
  ["lantern", 6, "lantern"],
  ["full-crew", 7, "crew"],
  ["genesis-room", 7, "beat-0"],
  ["sha-beach", 7, "beach"],
];
// The top skills: working, running, reading the market and the street, keeping calm, driving and climbing.
const skills: readonly (readonly [string, (day: DayState) => boolean])[] = [
  ["grinder", (day) => day.gigs >= 3],
  ["shook-the-tuxes", (day) => day.shook],
  ["storm-funnel", (day) => day.storm >= 100_000],
  ["diamond-hands", (day) => has(day, "diamond")],
  ["scam-spotted", (day) => day.spotted >= 1],
  ["based", (day) => day.warned >= 1],
  ["saved-the-rest", (day) => day.saved],
  ["touching-grass", (day) => day.grass],
  ["road-trip", (day) => kindsTaken(day) >= 5],
  ["rooftop-runner", (day) => has(day, "roof")],
];
// The hidden ones: the Time Machine and the timeline, the masks, the moon, and the city's secrets.
const hidden: readonly (readonly [string, (day: DayState) => boolean])[] = [
  ["time-machine", (day) => day.cause === "machine"],
  ["met-yourself", (day) => has(day, ...moments)],
  [
    "brighter-timeline",
    (day) => day.fate >= 3 && moments.every((id) => day.done.includes(id)),
  ],
  ["nine-masks", (day) => masksWorn(day) >= 9],
  ["to-the-moon", (day) => has(day, "moon")],
  ["the-watcher", (day) => has(day, "watcher")],
  ["pulled-the-plug", (day) => has(day, "plug")],
  ["dead-locker", (day) => has(day, "locker")],
  ["intergalactic-otc", (day) => has(day, "traded")],
];

export const milestones: readonly {
  readonly earned: (day: DayState) => boolean;
  readonly id: string;
}[] = [
  ...quests.map(([id, on, quest]) => ({
    earned: (day: DayState) =>
      day.day === on && day.loop === 0 && questDone(day, quest),
    id,
  })),
  ...[...skills, ...hidden].map(([id, earned]) => ({ earned, id })),
];

export const milestoneIds: readonly string[] = milestones.map(({ id }) => id);

export const earnedBy = (day: DayState): readonly string[] =>
  milestones.filter(({ earned }) => earned(day)).map(({ id }) => id);
