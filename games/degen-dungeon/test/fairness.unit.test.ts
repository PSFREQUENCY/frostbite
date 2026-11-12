import { describe, expect, it } from "vitest";

import { maxTicks, stormStart, stormTicks } from "../src/rules/constants.ts";
import { starsOf } from "../src/rules/heat.ts";
import { degenRules } from "../src/rules/index.ts";
import { milestoneIds } from "../src/rules/milestones.ts";
import { createBot } from "./support/bot.ts";
import { replay } from "./support/replay.ts";
import { machineDay, tripDay } from "./support/trips.ts";

// Every milestone can be earned by a legal day, and none by a day in which nothing is done.
function busyDay() {
  const bot = createBot(1, 0, 1);
  bot.use("gig-neon");
  bot.use("drop-exchange");
  bot.use("faucet");
  bot.use("recruit-7");
  bot.pick(true);
  for (const word of ["word-a", "word-b", "word-c"]) bot.use(word);
  bot.use("gig-exchange");
  bot.use("drop-marina");
  bot.use("recruit-6");
  bot.pick(true);
  bot.use("gig-street");
  bot.use("drop-shaft");
  bot.use("offer-scruff");
  bot.pick(true);
  bot.use("freezer");
  bot.use("stop-3");
  for (let ride = 1; ride < 8; ride += 1) bot.act();
  bot.use("home-0");
  return bot;
}

// Loot, then a helicopter borrowed twice over: four stars. The tux comes from the west, so the bot walks east to the Rebrand booth, pays
// for a new look, waits for the rest of the heat to fade, and sells the loot.
function hotDay() {
  const bot = createBot(1, 7, 2);
  bot.use("loot-vault");
  bot.use("ride-heli");
  bot.act();
  bot.act();
  bot.act();
  return bot;
}

function stormDay(tools: boolean) {
  const bot = createBot(5, 0, 3);
  if (tools) {
    bot.use("tool-magnet");
    bot.use("tool-vacuum");
  }
  bot.go(32_500, 18_000);
  bot.skipTo(stormStart + stormTicks);
  bot.end();
  return bot;
}

describe("the milestones", () => {
  it("are all within reach of legal days, and a day of honest work fits inside one day", () => {
    const busy = busyDay();
    expect(busy.state().tick).toBeLessThan(maxTicks);
    expect(degenRules.earned(busy.state())).toEqual([
      "faucet",
      "first-gig",
      "grinder",
      "first-crew",
      "full-crew",
      "full-loop",
      "cold-storage",
      "home-safe",
      "three-words",
      "payday",
    ]);

    const hot = hotDay();
    expect(starsOf(hot.state().heat)).toBeGreaterThanOrEqual(3);
    hot.hold(0, 116);
    hot.act();
    expect(starsOf(hot.state().heat)).toBeLessThan(3);
    hot.wait(30 * 140);
    expect([hot.here().heat, hot.here().shook, hot.here().ended]).toEqual([
      0,
      true,
      false,
    ]);
    hot.use("fence");
    hot.use("offer-kiki");
    hot.pick(false);
    hot.end();
    expect(degenRules.earned(hot.state())).toEqual([
      "scam-spotted",
      "fenced",
      "shook-the-tuxes",
    ]);

    const bare = stormDay(false);
    expect(degenRules.earned(bare.state())).toEqual(["storm-catch"]);
    const funnel = stormDay(true);
    expect(degenRules.earned(funnel.state())).toEqual([
      "storm-catch",
      "storm-funnel",
    ]);

    const reached = new Set(
      [busy, hot, bare, funnel, machineDay(), tripDay()].flatMap((bot) =>
        degenRules.earned(bot.state()),
      ),
    );
    expect([...reached].sort()).toEqual([...milestoneIds].sort());
    expect(new Set(milestoneIds).size).toBe(milestoneIds.length);
  });

  it("are not earned by a day in which nothing is done, and a bot's day replays to the same end", () => {
    const idle = createBot(1, 7, 1);
    idle.skipTo(maxTicks);
    idle.end();
    expect([idle.state().cause, degenRules.earned(idle.state())]).toEqual([
      "timeout",
      [],
    ]);
    const busy = busyDay();
    expect(
      replay({ config: { day: 1, hero: 0 }, inputs: busy.inputs, seed: 1 }),
    ).toEqual(busy.state());
  });
});
