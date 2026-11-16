import { invasionTick, beamWait, beams } from "../../src/rules/invasion.ts";
import { spots, type Spot } from "../../src/rules/places.ts";
import { statueId, statues } from "../../src/rules/statues.ts";
import type { Wheels } from "../../src/rules/types.ts";
import { createBot } from "./bot.ts";

type Bot = ReturnType<typeof createBot>;

// The days that earn the milestones of round five: the saucers met three ways, nine masks, a road trip and a big rig.
const counterOf = (node: string): Spot => {
  const found = spots.find(
    (spot) => spot.kind === "talk" && spot.node === node,
  );
  if (found === undefined) throw new Error(`no ${node}`);
  return found;
};
// The kerb ride of a kind nearest a point.
export const kerbNear = (ride: Wheels, x: number, z: number): Spot => {
  const near = spots
    .filter((spot) => spot.kind === "parked" && spot.ride === ride)
    .sort(
      (a, b) =>
        Math.abs(a.x - x) +
        Math.abs(a.z - z) -
        Math.abs(b.x - x) -
        Math.abs(b.z - z),
    )[0];
  if (near === undefined) throw new Error(`no ${ride}`);
  return near;
};

// A day of the mania (story day three) that stands in the first beam once the saucers are down, carrying what it was given, and gives the answer aboard
// (if one is asked and given).
export function saucerDay(
  gifts: readonly ("hardware" | "pizza")[],
  bag = false,
  answer?: number,
): Bot {
  const bot = createBot(3, 7, 3);
  for (const kind of gifts) {
    bot.use(counterOf(`shop-${kind}`).id);
    bot.pick(0);
    bot.pick(1);
  }
  if (bag) {
    bot.use("chart");
    bot.pick(0);
    bot.pick(3);
  }
  if (bot.here().tick < invasionTick) bot.skipTo(invasionTick);
  const beam = beams[0] ?? { x: 0, z: 0 };
  bot.go(beam.x, beam.z);
  bot.wait(beamWait + 2);
  if (answer !== undefined) bot.pick(answer);
  return bot;
}

// Every statue's mask, one after another, at a run (a masked hero is quicker still), once the story has been won (before then the
// statues stay stone).
export function masksDay(won = true): Bot {
  const bot = createBot(2, 7, 1, 0, 0, 0, won);
  bot.gait(1);
  for (const index of [0, 1, 2, 5, 4, 3, 6, 7, 8])
    if (statues[index] !== undefined) bot.use(statueId(index));
  return bot;
}

// Five kinds of ride from the kerb: a bike and a scooter, then three with engines, a cool-down apart so the heat never brings a tux.
export function roadTripDay(): Bot {
  const bot = createBot(6, 7, 1);
  let at = bot.here();
  for (const ride of ["bike", "scooter", "car", "moto", "van"] as const) {
    const kerb = kerbNear(ride, at.x, at.z);
    bot.use(kerb.id);
    if (bot.here().rideId !== kerb.id) bot.act();
    if (ride !== "bike" && ride !== "scooter") bot.wait(4_800);
    at = bot.here();
  }
  return bot;
}

// A semi truck's cab, taken from the kerb.
export function bigRigDay(): Bot {
  const bot = createBot(8, 7, 1);
  const home = bot.here();
  bot.use(kerbNear("semi", home.x, home.z).id);
  return bot;
}
