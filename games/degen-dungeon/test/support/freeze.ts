import { rayCooldown } from "../../src/rules/freeze.ts";
import { insideAt, rooms } from "../../src/rules/rooms.ts";
import { rayStore } from "../../src/rules/sites.ts";
import { statueId } from "../../src/rules/statues.ts";
import { createBot } from "./bot.ts";

type Bot = ReturnType<typeof createBot>;

// Once the story is won: the Harbor Sprinter's mask from its statue on Cold Harbor's middle street, then round by the west and north
// streets to Cold Harbor Deli, in at its door and across to the freezer, and the freeze ray out of the frost.
export function armed(seed = 21, hero = 7, day = 1): Bot {
  const bot = createBot(seed, hero, day, 0, 0, 0, true);
  bot.use(statueId(0));
  const deli = rooms.find(({ id }) => id === rayStore);
  if (deli === undefined) throw new Error("no deli");
  const door = deli.counter.x;
  const freezer = insideAt(deli, 100, 900);
  bot.leg("x", 400);
  bot.leg("z", 600);
  bot.leg("x", door);
  bot.leg("z", freezer.z);
  bot.leg("x", freezer.x);
  bot.act();
  bot.pick(0);
  bot.leg("x", door);
  bot.leg("z", 600);
  return bot;
}

// The riot morning, armed: a sweep of nine shots through the crowd in The Exchange, close enough together that more than thirty-six
// stand frozen at once before the first of them thaw.
const sweep = [
  [18_000, 15_000, 1],
  [17_500, 18_000, 1],
  [17_500, 18_000, 4],
  [18_000, 18_000, 15],
  [18_000, 18_000, 9],
  [18_000, 18_000, 11],
  [18_000, 17_500, 0],
  [18_000, 18_500, 2],
  [17_500, 18_000, 9],
] as const;
export function subZeroDay(): Bot {
  const bot = armed();
  for (const [x, z, dir] of sweep) {
    bot.go(x, z);
    bot.head(dir);
    bot.head(-1);
    bot.shoot();
    bot.wait(rayCooldown);
  }
  return bot;
}
