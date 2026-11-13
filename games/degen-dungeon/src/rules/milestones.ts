import { moments } from "./machine.ts";
import { chapterDone } from "./story.ts";
import type { DayState } from "./types.ts";

// Every milestone this game can earn, each decided by the state of a day alone (so a replay can decide it too). The ids are the ones in
// the game's manifest, which holds their words. No two are earned by the same event. They are a draft for the owner.
const has = (day: DayState, ...names: readonly string[]): boolean =>
  names.some((name) => day.done.includes(name));
const told = (on: number) => (day: DayState) =>
  day.day === on && chapterDone(day);

export const milestones: readonly {
  readonly earned: (day: DayState) => boolean;
  readonly id: string;
}[] = [
  { earned: (day) => has(day, "faucet"), id: "faucet" },
  { earned: (day) => day.gigs >= 1, id: "first-gig" },
  { earned: (day) => day.gigs >= 3, id: "grinder" },
  { earned: (day) => day.crew.length >= 1, id: "first-crew" },
  { earned: (day) => day.crew.length >= 2, id: "full-crew" },
  { earned: (day) => day.spotted >= 1, id: "scam-spotted" },
  { earned: (day) => day.rides >= 8, id: "full-loop" },
  { earned: (day) => day.fenced > 0, id: "fenced" },
  { earned: (day) => day.shook, id: "shook-the-tuxes" },
  { earned: (day) => has(day, "stash"), id: "cold-storage" },
  { earned: (day) => day.cause === "home", id: "home-safe" },
  { earned: (day) => day.storm >= 5_000, id: "storm-catch" },
  { earned: (day) => day.storm >= 100_000, id: "storm-funnel" },
  { earned: (day) => day.words >= 3, id: "three-words" },
  { earned: (day) => day.made >= 1_000, id: "payday" },
  { earned: (day) => day.cause === "machine", id: "time-machine" },
  { earned: (day) => has(day, ...moments), id: "met-yourself" },
  {
    earned: (day) =>
      day.fate >= 3 && moments.every((id) => day.done.includes(id)),
    id: "brighter-timeline",
  },
  { earned: (day) => has(day, "speech"), id: "the-speech" },
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
    earned: (day) => day.done.some((id) => id.startsWith("car-")),
    id: "joyride",
  },
  { earned: (day) => has(day, "moon"), id: "to-the-moon" },
];

export const milestoneIds: readonly string[] = milestones.map(({ id }) => id);

export const earnedBy = (day: DayState): readonly string[] =>
  milestones.filter(({ earned }) => earned(day)).map(({ id }) => id);
