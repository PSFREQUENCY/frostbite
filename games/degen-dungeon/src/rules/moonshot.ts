import { startState, stepInt } from "@frostbite/game-sdk/seeded";

import { shotOdds, shotPays, shotStakes, shotWindow } from "./constants.ts";
import type { Draft } from "./types.ts";

// The moonshot: a stake at the launchpad rides on the next launch, where it goes a hundred times up or to nothing. Whether a launch hits
// is the seed's: the same for every player of a seed and every launch of a day, and about one in thirty. It is a lucky shot, the one way
// a day can make the moon fare. One stake flies at a time.
export const hits = (seed: number, launch: number): boolean => {
  let mixed = Math.imul(
    (seed ^ Math.imul(launch + 1, 0x9e_37_79_b1)) >>> 0,
    0x85_eb_ca_6b,
  );
  mixed = Math.imul(mixed ^ (mixed >>> 13), 0xc2_b2_ae_35);
  return stepInt(startState(mixed ^ (mixed >>> 16)), shotOdds).value === 0;
};

export function stake(day: Draft, which: number): string | null {
  const amount = shotStakes[which] ?? 0;
  if (day.shot > 0) return "your moonshot is still in the air";
  if (day.pocket < amount) return "not enough DUN";
  day.pocket -= amount;
  day.shot = amount;
  day.shotAt = (Math.floor(day.tick / shotWindow) + 1) * shotWindow;
  return null;
}

// At its launch a stake lands: a hit pays a hundred times (the profit counts as made), a miss is gone.
export function launch(day: Draft): void {
  if (day.shot === 0 || day.tick < day.shotAt) return;
  if (hits(day.seed, day.shotAt / shotWindow)) {
    day.pocket += day.shot * shotPays;
    day.made += day.shot * (shotPays - 1);
    if (!day.done.includes("moonshot")) day.done = [...day.done, "moonshot"];
  }
  day.shot = 0;
}
