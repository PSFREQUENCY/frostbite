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
  roofDay,
  stormDay,
} from "./support/days.ts";
import { moonDay, nightDay } from "./support/night.ts";
import {
  bigRigDay,
  masksDay,
  roadTripDay,
  saucerDay,
  saucerPilotDay,
} from "./support/sky.ts";
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
      saucerDay(["hardware", "pizza"], false, 0),
      saucerDay([], true, 1),
      saucerDay([]),
      masksDay(),
      roadTripDay(),
      bigRigDay(),
      roofDay(),
      saucerPilotDay(),
      ...[1, 2, 3, 4, 5, 6, 7].map((day) =>
        tellStory(createBot(10 + day, day % 9, day)),
      ),
    ];
    for (const bot of bots) expect(bot.here().tick).toBeLessThan(maxTicks);
    const reached = new Set(bots.flatMap(earned));
    expect([...reached].sort()).toEqual([...milestoneIds].sort());
    expect(new Set(milestoneIds).size).toBe(milestoneIds.length);
    expect(milestoneIds.length).toBe(40);
  });

  it("are each earned for what the day did, and only that", () => {
    expect(earned(busyDay())).toEqual([
      "heard-frost",
      "seed-paper",
      "grinder",
      "dead-locker",
    ]);
    expect(earned(hotDay())).toEqual(["shook-the-tuxes"]);
    expect(earned(stormDay(false))).toEqual([]);
    expect(earned(drainDay())).toEqual(["seed-paper", "saved-the-rest"]);
    expect(earned(cornersDay())).toEqual([
      "scam-spotted",
      "based",
      "the-watcher",
      "pulled-the-plug",
    ]);
    expect(earned(grassDay())).toEqual(["touching-grass"]);
    expect(earned(nightDay())).toEqual([]);
    expect(earned(moonDay())).toContain("to-the-moon");
    expect(earned(saucerDay(["hardware", "pizza"], false, 0))).toEqual([]);
    expect(earned(saucerDay([], true, 1))).toEqual(["intergalactic-otc"]);
    expect(earned(saucerDay([]))).toEqual([]);
    expect(earned(masksDay())).toEqual(["nine-masks"]);
    // Before the story is won the statues stay stone, and a mask will not go on.
    expect(() => masksDay(false)).toThrow(
      "the statues wake once the story is won",
    );
    expect(earned(roadTripDay())).toEqual(["road-trip"]);
    expect(earned(bigRigDay())).toEqual([]);
    expect(earned(roofDay())).toEqual(["rooftop-runner"]);
    expect(earned(saucerPilotDay())).toEqual(["saucer-pilot"]);
    // Each story day earns its own quests' milestones, in order.
    const quests = [1, 2, 3, 4, 5, 6, 7].map((day) =>
      earned(tellStory(createBot(10 + day, day % 9, day))).slice(
        0,
        day === 1 ? 2 : 3,
      ),
    );
    expect(quests).toEqual([
      ["heard-frost", "seed-paper"],
      ["first-gig", "green-line", "first-trade"],
      ["caught-the-mania", "riding-the-pump", "hustle"],
      ["cold-open", "thin-ice", "crew-up"],
      ["countdown", "liftoff", "big-play"],
      ["dream", "moon-party", "lantern"],
      ["full-crew", "genesis-room", "sha-beach"],
    ]);
  });

  it("are not earned by a day in which nothing is done, and a bot's day replays to the same end", () => {
    for (const day of [1, 2, 3, 4, 5, 6, 7]) {
      const idle = createBot(1, 7, day);
      idle.skipTo(maxTicks);
      idle.end();
      expect([idle.state().cause, earned(idle)]).toEqual(["timeout", []]);
    }
    const busy = busyDay();
    expect(
      replay({ config: { day: 1, hero: 0 }, inputs: busy.inputs, seed: 1 }),
    ).toEqual(busy.state());
    const beach = tellStory(createBot(14, 8, 7));
    expect(
      replay({ config: { day: 7, hero: 8 }, inputs: beach.inputs, seed: 14 }),
    ).toEqual(beach.state());
  });
});
