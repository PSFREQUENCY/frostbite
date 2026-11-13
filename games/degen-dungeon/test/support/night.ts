import { nightTick, shotWindow } from "../../src/rules/constants.ts";
import { hits } from "../../src/rules/moonshot.ts";
import { spotNamed, spots } from "../../src/rules/places.ts";
import type { Spot } from "../../src/rules/spot.ts";
import { createBot } from "./bot.ts";

type Bot = ReturnType<typeof createBot>;

// The parked ride of a kind nearest a place.
export function parkedNear(
  ride: "bike" | "car" | "scooter",
  x: number,
  z: number,
): Spot {
  const near = spots
    .filter((spot) => spot.kind === "parked" && spot.ride === ride)
    .sort(
      (a, b) =>
        Math.abs(a.x - x) +
        Math.abs(a.z - z) -
        Math.abs(b.x - x) -
        Math.abs(b.z - z),
    )[0];
  if (near === undefined) throw new Error(`no parked ${ride}`);
  return near;
}

// A day out of doors and in: a coffee at GM Coffee, a run, a borrowed car, the lantern ground after dark with a wish, and home to sleep.
export function nightDay(wish = 1, seed = 5, boon = 0): Bot {
  const bot = createBot(seed, 7, 2, 0, 0, boon);
  bot.use("room-4-0");
  bot.pick(0);
  bot.pick(1);
  bot.gait(1);
  const counter = spotNamed("room-4-0");
  if (counter === undefined) throw new Error("no GM Coffee");
  bot.use(parkedNear("car", counter.x, counter.z).id);
  if (bot.here().tick < nightTick) bot.skipTo(nightTick);
  bot.use("lanterns");
  bot.pick(wish - 1);
  bot.sleep();
  return bot;
}

// A lucky Moon Night: a seed whose next launch hits, ten thousand DUN staked at the launchpad, the hundredfold landing, a seat on the
// shuttle, and the moon underfoot.
export function moonDay(): Bot {
  for (let seed = 1; seed < 400; seed += 1) {
    const bot = createBot(seed, 7, 5);
    bot.use("launchpad");
    bot.pick(2);
    const { shotAt } = bot.here();
    if (!hits(seed, shotAt / shotWindow)) continue;
    bot.wait(shotAt - bot.here().tick + 1);
    bot.use("shuttle");
    bot.pick(0);
    bot.end();
    return bot;
  }
  throw new Error("no lucky seed");
}
