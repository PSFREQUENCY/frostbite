import { moments } from "./machine.ts";
import type { DayState } from "./types.ts";

// Every milestone this game can earn, each decided by the state of a day alone (so a replay can decide it too). The ids are the ones in
// the game's manifest, which holds their words. No two are earned by the same event. They are a draft for the owner.
export const milestones: readonly {
  readonly earned: (day: DayState) => boolean;
  readonly id: string;
}[] = [
  { earned: (day) => day.done.includes("faucet"), id: "faucet" },
  { earned: (day) => day.gigs >= 1, id: "first-gig" },
  { earned: (day) => day.gigs >= 3, id: "grinder" },
  { earned: (day) => day.crew.length >= 1, id: "first-crew" },
  { earned: (day) => day.crew.length >= 2, id: "full-crew" },
  { earned: (day) => day.spotted >= 1, id: "scam-spotted" },
  { earned: (day) => day.rides >= 8, id: "full-loop" },
  { earned: (day) => day.fenced > 0, id: "fenced" },
  { earned: (day) => day.shook, id: "shook-the-tuxes" },
  { earned: (day) => day.freezer >= 500, id: "cold-storage" },
  { earned: (day) => day.cause === "home", id: "home-safe" },
  { earned: (day) => day.storm >= 5_000, id: "storm-catch" },
  { earned: (day) => day.storm >= 100_000, id: "storm-funnel" },
  { earned: (day) => day.words >= 3, id: "three-words" },
  { earned: (day) => day.made >= 1_000, id: "payday" },
  { earned: (day) => day.cause === "machine", id: "time-machine" },
  {
    earned: (day) => moments.some((id) => day.done.includes(id)),
    id: "met-yourself",
  },
  {
    earned: (day) =>
      day.fate >= 3 && moments.every((id) => day.done.includes(id)),
    id: "brighter-timeline",
  },
];

export const milestoneIds: readonly string[] = milestones.map(({ id }) => id);

export const earnedBy = (day: DayState): readonly string[] =>
  milestones.filter(({ earned }) => earned(day)).map(({ id }) => id);
