import { startState, stepInt } from "@frostbite/game-sdk/seeded";

import { block } from "./constants.ts";
import { inReach } from "./places.ts";
import type { DayState, Draft, Point } from "./types.ts";

// The watcher: once a day someone in a hooded parka stands at the corner of one borough, and only frost vision shows the footprints. The
// seed and the day decide which borough, so nobody can learn the spot. S's letters are places of their own (`places.ts`).
export function watcherAt(seed: number, day: number): Point {
  const borough = stepInt(
    startState(Math.imul(seed ^ (day * 0x27_d4_eb_2f), 0x9e_37_79_b1)),
    9,
  ).value;
  return {
    x: block * (borough % 3) + 400,
    z: block * Math.floor(borough / 3) + 400,
  };
}

export function actMystery(day: Draft): string | null | undefined {
  if (day.loop > 0 || !day.looking) return undefined;
  if (!inReach(day, watcherAt(day.seed, day.day))) return undefined;
  if (day.done.includes("watcher")) return "the footprints end here";
  day.done = [...day.done, "watcher"];
  return null;
}

export const sighted = (day: Pick<DayState, "done">): boolean =>
  day.done.includes("watcher");
