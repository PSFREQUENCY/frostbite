import { stormStart, stormTicks } from "../../src/rules/constants.ts";
import { watcherAt } from "../../src/rules/mystery.ts";
import { spotNamed } from "../../src/rules/places.ts";
import { createBot } from "./bot.ts";

type Bot = ReturnType<typeof createBot>;
const lookAt = (bot: Bot, id: string): void => {
  const spot = spotNamed(id);
  if (spot === undefined) throw new Error(`no spot named ${id}`);
  bot.go(spot.x, spot.z);
  bot.look();
  bot.act();
  bot.look();
};

// The first morning done properly, then a long day of honest work: the riot, Frost's speech, the Faucet and the seed paper in the
// freezer, the hero's own word, three gigs, a crew of three, three street words and the dead locker, an honest offer, a letter, the
// freezer, the whole Green Line, and sleep.
export function busyDay(): Bot {
  const bot = createBot(1, 0, 1);
  bot.use("gig-neon");
  bot.use("drop-exchange");
  bot.use("frost");
  for (let line = 0; line < 3; line += 1) bot.pick(0);
  bot.use("faucet");
  bot.pick(3);
  bot.use("recruit-7");
  bot.pick(true);
  for (const word of ["word-a", "word-b", "word-c", "locker"]) bot.use(word);
  bot.use("gig-exchange");
  bot.use("drop-marina");
  bot.use("recruit-6");
  bot.pick(true);
  bot.use("gig-street");
  bot.use("drop-shaft");
  bot.use("offer-scruff");
  bot.pick(true);
  bot.use("letter-3");
  bot.use("freezer");
  bot.use("stop-3");
  for (let ride = 1; ride < 8; ride += 1) bot.act();
  lookAt(bot, "heroword-0");
  bot.sleep();
  return bot;
}

// Loot, then a helicopter borrowed twice over: four stars. The tux comes from the west, so the bot walks east to the Rebrand booth, pays
// for a new look, waits for the rest of the heat to fade, and sells the loot.
export function hotDay(): Bot {
  const bot = createBot(1, 7, 2);
  bot.use("loot-vault");
  bot.use("ride-heli");
  bot.act();
  bot.act();
  bot.act();
  bot.hold(0, 116);
  bot.act();
  bot.wait(5_000);
  bot.use("fence");
  return bot;
}

export function stormDay(tools: boolean): Bot {
  const bot = createBot(5, 0, 3);
  if (tools) {
    bot.use("tool-magnet");
    bot.use("tool-vacuum");
  }
  bot.go(32_500, 18_000);
  bot.skipTo(stormStart);
  bot.hold(4, stormTicks);
  bot.end();
  return bot;
}

// The seed paper in a pocket on the first morning: the test finds it, the balance drains, and the hideout terminal saves the rest.
export function drainDay(): Bot {
  const bot = createBot(1, 6, 1);
  bot.use("offer-scruff");
  bot.pick(true);
  bot.use("faucet");
  bot.pick(0);
  bot.go(18_000, 3_600);
  bot.skipTo(bot.here().paperAt + 2_400 + 300);
  bot.use("home-6");
  bot.pick(1);
  bot.pick(1);
  return bot;
}

// A day of the city's other corners: a scam walked away from and reported to Frost, a fit and a home bought, the bot farm unplugged,
// the watcher's footprints, a bag bought before the storm and held through it, and FOMO walked off in the park.
export function cornersDay(): Bot {
  const bot = createBot(2, 7, 4);
  bot.use("offer-kiki");
  bot.pick(false);
  bot.use("frost");
  bot.pick(0);
  bot.use("fits");
  bot.pick(1);
  bot.pick(3);
  bot.use("realtor");
  bot.pick(0);
  bot.pick(3);
  lookAt(bot, "plug");
  const watcher = watcherAt(2, 4);
  bot.go(watcher.x, watcher.z);
  bot.look();
  bot.act();
  bot.look();
  return bot;
}

export function diamondDay(): Bot {
  const bot = createBot(2, 0, 3);
  bot.use("faucet");
  bot.use("chart");
  bot.pick(0);
  bot.pick(3);
  bot.skipTo(stormStart + stormTicks + 5);
  bot.end();
  return bot;
}

// FOMO climbs through the mania, then the bot sits in the Old Floe park until it is gone.
export function grassDay(): Bot {
  const bot = createBot(3, 0, 2);
  bot.skipTo(4_600);
  bot.go(30_000, 6_000);
  bot.wait(1_000);
  bot.end();
  return bot;
}
