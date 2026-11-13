import { waterline } from "../../src/rules/constants.ts";
import { beatOf } from "../../src/rules/story.ts";
import { createBot } from "./bot.ts";

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

// Plays the day's story through, beat by beat, meeting each need on the way. `answer` picks the first or second answer where a beat asks.
// On the last day it opens the Genesis Room and runs the tunnel to SHA Beach.
export function tellStory(bot: Bot, answer = 1): Bot {
  for (let beats = 0; beats < 6; beats += 1) {
    const beat = beatOf(bot.here());
    if (beat === null) break;
    const need = beat.need ?? {};
    if (
      need.crew !== undefined &&
      !bot.here().crew.some((mate) => need.crew?.includes(mate))
    )
      recruit(bot, need.crew);
    while (bot.here().crew.length < (need.crewSize ?? 0))
      recruit(
        bot,
        [0, 1, 2, 3, 4, 5, 6, 7, 8].filter((hero) => hero !== 9),
      );
    earn(bot, need.pay ?? 0, need.gigs ?? 0);
    if (bot.here().rides < (need.rides ?? 0)) {
      bot.use("stop-7");
      while (bot.here().rides < (need.rides ?? 0)) bot.act();
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
