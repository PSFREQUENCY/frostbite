import { moments } from "./machine.ts";
import { masksWorn } from "./statues.ts";
import { chapterDone } from "./story.ts";
import type { DayState } from "./types.ts";

// Every milestone this game can earn, each decided by the state of a day alone (so a replay can decide it too). The ids are the ones in
// the game's manifest, which holds their words. No two are earned by the same event. They are a draft for the owner.
const has = (day: DayState, ...names: readonly string[]): boolean =>
  names.some((name) => day.done.includes(name));
const told = (on: number) => (day: DayState) =>
  day.day === on && chapterDone(day);
// How many kinds of ride the hero took from the kerb today, not counting a semi's cab (which has a milestone of its own).
const kindsTaken = (day: DayState): number =>
  new Set(
    day.done.flatMap((id) => {
      const kind = /^(bike|car|moto|scooter|truck|van)-\d+$/u.exec(id)?.[1];
      return kind === undefined ? [] : [kind];
    }),
  ).size;

export const milestones: readonly {
  readonly earned: (day: DayState) => boolean;
  readonly id: string;
}[] = [
  { earned: (day) => has(day, "contact"), id: "first-contact" },
  { earned: (day) => has(day, "traded"), id: "intergalactic-otc" },
  { earned: (day) => day.gigs >= 3, id: "grinder" },
  { earned: (day) => day.cause === "abducted", id: "taken-up" },
  { earned: (day) => day.crew.length >= 2, id: "full-crew" },
  { earned: (day) => day.spotted >= 1, id: "scam-spotted" },
  { earned: (day) => day.rides >= 8, id: "full-loop" },
  { earned: (day) => day.fenced > 0, id: "fenced" },
  { earned: (day) => day.shook, id: "shook-the-tuxes" },
  { earned: (day) => has(day, "stash"), id: "cold-storage" },
  { earned: (day) => day.cause === "home", id: "home-safe" },
  { earned: (day) => masksWorn(day) >= 9, id: "nine-masks" },
  { earned: (day) => day.storm >= 100_000, id: "storm-funnel" },
  { earned: (day) => day.words >= 3, id: "three-words" },
  { earned: (day) => kindsTaken(day) >= 5, id: "road-trip" },
  { earned: (day) => day.cause === "machine", id: "time-machine" },
  { earned: (day) => has(day, ...moments), id: "met-yourself" },
  {
    earned: (day) =>
      day.fate >= 3 && moments.every((id) => day.done.includes(id)),
    id: "brighter-timeline",
  },
  { earned: (day) => masksWorn(day) >= 1, id: "masked" },
  { earned: (day) => has(day, "paper"), id: "seed-paper" },
  {
    earned: (day) => day.done.some((id) => id.startsWith("heroword-")),
    id: "your-word",
  },
  { earned: told(2), id: "hustle" },
  { earned: told(3), id: "crew-up" },
  { earned: told(4), id: "big-play" },
  { earned: (day) => day.dream > 0, id: "dream" },
  { earned: (day) => day.gate > 0, id: "genesis-room" },
  { earned: (day) => day.cause === "beach", id: "sha-beach" },
  { earned: (day) => day.letters >= 1, id: "dear-newbie" },
  { earned: (day) => has(day, "watcher"), id: "the-watcher" },
  { earned: (day) => has(day, "plug"), id: "pulled-the-plug" },
  { earned: (day) => has(day, "locker"), id: "dead-locker" },
  { earned: (day) => has(day, "diamond"), id: "diamond-hands" },
  { earned: (day) => day.grass, id: "touching-grass" },
  { earned: (day) => day.warned >= 1, id: "based" },
  { earned: (day) => day.saved, id: "saved-the-rest" },
  {
    earned: (day) => has(day, "home-studio", "home-rowhouse", "home-yard"),
    id: "moved-up",
  },
  {
    earned: (day) => has(day, "fit-gloves", "fit-shades", "fit-parka"),
    id: "fresh-fit",
  },
  { earned: (day) => has(day, "lantern"), id: "lantern" },
  {
    earned: (day) => day.done.some((id) => id.startsWith("semi-")),
    id: "big-rig",
  },
  { earned: (day) => has(day, "moon"), id: "to-the-moon" },
];

export const milestoneIds: readonly string[] = milestones.map(({ id }) => id);

export const earnedBy = (day: DayState): readonly string[] =>
  milestones.filter(({ earned }) => earned(day)).map(({ id }) => id);
