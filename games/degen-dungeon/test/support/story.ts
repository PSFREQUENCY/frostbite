import { waterline } from "../../src/rules/constants.ts";
import { spotNamed } from "../../src/rules/places.ts";
import { beatOf, questOf, type Quest } from "../../src/rules/story.ts";
import { createBot } from "./bot.ts";
import { runDash } from "./dash.ts";

type Bot = ReturnType<typeof createBot>;
const honest = [
  ["gig-street", "drop-shaft"],
  ["gig-exchange", "drop-marina"],
  ["gig-neon", "drop-exchange"],
] as const;

// Honest gigs until the pocket holds enough or enough gigs are done.
function earn(bot: Bot, pocket: number, gigs: number): void {
  for (let round = 0; round < 12; round += 1) {
    const day = bot.here();
    if (day.pocket >= pocket && day.gigs >= gigs) return;
    const [gig, drop] = honest[round % honest.length] ?? honest[0];
    bot.use(gig);
    bot.use(drop);
  }
}

// Someone from the list joins the crew (anyone at all for a crew size), never the lead.
function recruit(bot: Bot, from: readonly number[]): void {
  const day = bot.here();
  const who = from.find(
    (hero) => hero !== day.hero && !day.crew.includes(hero),
  );
  if (who === undefined) throw new Error("nobody left to recruit");
  bot.use(`recruit-${String(who)}`);
  bot.pick(true);
}

// The first morning's errand: the wallet off the street, in at ADOR's door to Pearl, and back out onto the street.
export const adorDoor = { x: 21_100, z: 17_500 };
export function returnWallet(bot: Bot): void {
  bot.use("wallet");
  bot.pick(0);
  const pearl = spotNamed("pearl");
  if (pearl === undefined) throw new Error("no Pearl");
  bot.go(adorDoor.x, adorDoor.z);
  bot.leg("z", pearl.z);
  bot.leg("x", pearl.x);
  bot.act();
  bot.pick(0);
  bot.leg("x", adorDoor.x);
  bot.leg("z", adorDoor.z);
}

// The first two days' quests, done the plain way: the speech heard, the wallet given back and the paper in the freezer; a gig, a stop on
// the Green Line, a buy on the Exchange floor.
function street(bot: Bot, quest: Quest): void {
  if (quest === "speech") {
    bot.use("frost");
    for (let line = 0; line < 3; line += 1) bot.pick(0);
  }
  if (quest === "wallet") returnWallet(bot);
  if (quest === "paper") {
    bot.use("faucet");
    bot.pick(3);
  }
  if (quest === "gig") earn(bot, 0, 1);
  if (quest === "ride") bot.use("stop-7");
  if (quest === "trade") {
    bot.use("chart");
    bot.pick(0);
    bot.pick(3);
  }
}

// Plays the day's three quests through, meeting each beat's need on the way. `answer` picks the first or second answer where a beat
// asks. On Moon Night the bot runs the Degen Dash between the dream and the party; on the last day a crew of two opens the Genesis Room
// and the bot runs the tunnel.
export function tellStory(bot: Bot, answer = 1): Bot {
  for (let quests = 0; quests < 6; quests += 1) {
    const quest = questOf(bot.here());
    if (quest === null || quest === "beach") break;
    if (quest === "dash") {
      runDash(bot);
      continue;
    }
    if (quest === "crew") {
      while (bot.here().crew.length < 2)
        recruit(bot, [0, 1, 2, 3, 4, 5, 6, 7, 8]);
      continue;
    }
    const beat = beatOf(bot.here());
    if (beat === null) {
      street(bot, quest);
      continue;
    }
    const need = beat.need ?? {};
    if (
      need.crew !== undefined &&
      !bot.here().crew.some((mate) => need.crew?.includes(mate))
    )
      recruit(bot, need.crew);
    while (bot.here().crew.length < (need.crewSize ?? 0))
      recruit(bot, [0, 1, 2, 3, 4, 5, 6, 7, 8]);
    earn(bot, need.pay ?? 0, need.gigs ?? 0);
    if (bot.here().rides < (need.rides ?? 0)) {
      bot.use("stop-7");
      while (bot.here().rides < (need.rides ?? 0)) bot.ride();
    }
    if (need.traded === true) {
      bot.use("chart");
      bot.pick(0);
      bot.pick(1);
      bot.pick(3);
    }
    bot.go(beat.at.x, beat.at.z);
    if (need.vision === true) bot.look();
    bot.act();
    if (need.vision === true && bot.here().looking) bot.look();
    if (bot.here().talk === "beat") bot.pick(answer);
  }
  const day = bot.here();
  if (day.gate > 0 && !day.ended) {
    bot.head(12);
    bot.wait(Math.ceil((day.z - waterline) / 10) + 30);
  }
  return bot;
}
