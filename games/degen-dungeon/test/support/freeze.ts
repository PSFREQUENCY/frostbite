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

// The riot morning, armed: seven shots east along the street packed in front of the Global DEX, walked west to east in short steps, each
// down a line where the crowd stands thick, so that more than thirty-six stand frozen at once before the first of them thaw.
const sweep = [
  [12_800, 17_400],
  [13_500, 17_900],
  [14_200, 17_700],
  [14_800, 17_900],
  [14_900, 18_200],
  [15_300, 17_500],
  [15_400, 17_750],
] as const;
export function subZeroDay(): Bot {
  const bot = armed();
  const [first] = sweep;
  bot.go(first[0], first[1]);
  for (const [x, z] of sweep) {
    bot.leg("z", z);
    bot.leg("x", x);
    bot.head(0);
    bot.head(-1);
    bot.shoot();
    bot.wait(rayCooldown);
  }
  return bot;
}
