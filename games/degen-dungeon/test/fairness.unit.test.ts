import { describe, expect, it } from "vitest";

import { maxTicks } from "../src/rules/constants.ts";
import { degenRules } from "../src/rules/index.ts";
import { milestoneIds } from "../src/rules/milestones.ts";
import { createBot } from "./support/bot.ts";
import {
  busyDay,
  cornersDay,
  diamondDay,
  drainDay,
  grassDay,
  hotDay,
  stormDay,
} from "./support/days.ts";
import { moonDay, nightDay } from "./support/night.ts";
import { replay } from "./support/replay.ts";
import { tellStory } from "./support/story.ts";
import { machineDay, tripDay } from "./support/trips.ts";

// Every milestone can be earned by a legal day, and none by a day in which nothing is done.
describe("the milestones", () => {
  const earned = (bot: ReturnType<typeof createBot>): readonly string[] =>
    degenRules.earned(bot.here());

  it("are all within reach of legal days, each of which fits inside one day", () => {
    const bots = [
      busyDay(),
      hotDay(),
      stormDay(false),
      stormDay(true),
      drainDay(),
      cornersDay(),
      diamondDay(),
      grassDay(),
      nightDay(),
      moonDay(),
      machineDay(),
      tripDay(),
      tellStory(createBot(11, 5, 2)),
      tellStory(createBot(12, 0, 3)),
      tellStory(createBot(13, 7, 4)),
      tellStory(createBot(14, 8, 5)),
    ];
    for (const bot of bots) expect(bot.here().tick).toBeLessThan(maxTicks);
    const reached = new Set(bots.flatMap(earned));
    expect([...reached].sort()).toEqual([...milestoneIds].sort());
    expect(new Set(milestoneIds).size).toBe(milestoneIds.length);
    expect(milestoneIds.length).toBeLessThanOrEqual(40);
  });

  it("are each earned for what the day did, and only that", () => {
    expect(earned(busyDay())).toEqual([
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
      "the-speech",
      "seed-paper",
      "your-word",
      "dear-newbie",
      "dead-locker",
    ]);
    expect(earned(hotDay())).toEqual(["fenced", "shook-the-tuxes"]);
    expect(earned(stormDay(false))).toEqual(["storm-catch"]);
    expect(earned(drainDay())).toEqual([
      "faucet",
      "seed-paper",
      "saved-the-rest",
    ]);
    expect(earned(cornersDay())).toEqual([
      "scam-spotted",
      "the-watcher",
      "pulled-the-plug",
      "based",
      "moved-up",
      "fresh-fit",
    ]);
    expect(earned(grassDay())).toEqual(["touching-grass"]);
    expect(earned(nightDay())).toEqual(["home-safe", "lantern", "joyride"]);
    expect(earned(moonDay())).toContain("to-the-moon");
  });

  it("are not earned by a day in which nothing is done, and a bot's day replays to the same end", () => {
    for (const day of [1, 2, 3, 4, 5]) {
      const idle = createBot(1, 7, day);
      idle.skipTo(maxTicks);
      idle.end();
      expect([idle.state().cause, earned(idle)]).toEqual(["timeout", []]);
    }
    const busy = busyDay();
    expect(
      replay({ config: { day: 1, hero: 0 }, inputs: busy.inputs, seed: 1 }),
    ).toEqual(busy.state());
    const beach = tellStory(createBot(14, 8, 5));
    expect(
      replay({ config: { day: 5, hero: 8 }, inputs: beach.inputs, seed: 14 }),
    ).toEqual(beach.state());
  });
});
