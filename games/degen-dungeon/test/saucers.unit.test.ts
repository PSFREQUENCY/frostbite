import { describe, expect, it } from "vitest";

import { clipFor } from "../src/page/clips.ts";
import { afterDay, freshProgress } from "../src/progress.ts";
import { questAt } from "../src/quest.ts";
import { moonPad, visionTicks } from "../src/rules/constants.ts";
import { advance } from "../src/rules/day.ts";
import {
  beams,
  beamWait,
  invading,
  invasionTick,
  settled,
  tradeTimes,
} from "../src/rules/invasion.ts";
import { priceAt } from "../src/rules/market.ts";
import { spots, type Spot } from "../src/rules/places.ts";
import { counter } from "../src/rules/counters.ts";
import type { Draft } from "../src/rules/types.ts";
import { createBot } from "./support/bot.ts";
import { refusal, started } from "./support/replay.ts";

const counterOf = (node: string): Spot => {
  const found = spots.find(
    (spot) => spot.kind === "talk" && spot.node === node,
  );
  if (found === undefined) throw new Error(`no ${node}`);
  return found;
};
const beam = beams[0] ?? { x: 0, z: 0 };
// A second-day bot that walks into the first beam once the saucers are down and stands there long enough to be taken up.
const intoBeam = (gifts: readonly ("hardware" | "pizza")[], bag = false) => {
  const bot = createBot(3, 7, 2);
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
  bot.go(beam.x, beam.z);
  bot.wait(beamWait + 2);
  return bot;
};

describe("the saucers", () => {
  it("come down on the second story day a quarter of the way in, and point the way to the gifts and then a beam", () => {
    const morning = started(3, 7, 2);
    expect(invading(morning)).toBe(false);
    const down = advance(morning, invasionTick);
    expect(invading(down)).toBe(true);
    expect(invading(advance(started(3, 7, 3), invasionTick))).toBe(false);
    const hardware = counterOf("shop-hardware");
    const pizza = counterOf("shop-pizza");
    expect(questAt(down)).toMatchObject({ x: hardware.x, z: hardware.z });
    const glowing = { ...down, done: [...down.done, "item-glow"] };
    expect(questAt(glowing)).toMatchObject({ x: pizza.x, z: pizza.z });
    const ready = { ...glowing, done: [...glowing.done, "item-pizza"] };
    expect(beams).toContainEqual(questAt(ready));
    expect(beams).toContainEqual(questAt({ ...down, bag: 100 }));
    expect(clipFor(morning, down, new Set())?.title).toBe("THEY ARE HERE");
  });

  it("take a hero with nothing to offer to the moon, asleep, and the story starts again from the first morning", () => {
    const bot = intoBeam([]);
    const day = bot.here();
    expect([day.ended, day.cause, day.x, day.z, day.gait]).toEqual([
      true,
      "abducted",
      moonPad.x,
      moonPad.z,
      3,
    ]);
    const before = { ...day, cause: null, ended: false };
    expect(clipFor(before, day, new Set())?.title).toBe("TAKEN UP");
    const { progress } = afterDay({ ...freshProgress, day: 2, wish: 3 }, day);
    expect([progress.day, progress.wish]).toEqual([1, 0]);
  });

  it("leave alone a hero walking through a beam, or riding through, or standing there a moment too short", () => {
    const down = advance(started(3, 7, 2), invasionTick);
    const standing = { ...down, dir: -1, x: beam.x, z: beam.z };
    const walking = advance({ ...standing, dir: 0 }, invasionTick + 3);
    expect([walking.ended, walking.beamed]).toEqual([false, 0]);
    const riding = advance(
      { ...standing, ride: "bike" },
      invasionTick + beamWait * 2,
    );
    expect([riding.ended, riding.talk]).toEqual([false, null]);
    const brief = advance(standing, invasionTick + beamWait - 2);
    expect([brief.ended, brief.beamed]).toEqual([false, beamWait - 2]);
  });

  it("make peace with glow sticks and pizza: standing, frost vision and the saucers going home", () => {
    const bot = intoBeam(["hardware", "pizza"]);
    const aboard = bot.here();
    expect(aboard.talk).toBe("abduction");
    expect(refusal(aboard, "pick", { choice: 1, tick: aboard.tick })).toBe(
      "you have no meme coins to show",
    );
    bot.pick(0);
    const after = bot.here();
    expect([after.talk, after.ended, settled(after), invading(after)]).toEqual([
      null,
      false,
      true,
      false,
    ]);
    expect(after.rep).toBe(aboard.rep + 100);
    expect(after.vision).toBeGreaterThanOrEqual(2 * visionTicks);
    expect(clipFor(aboard, after, new Set())?.title).toBe("FIRST CONTACT");
  });

  it("trade a bag of meme coins for more than the market pays, or go quietly", () => {
    const bot = intoBeam([], true);
    const aboard = bot.here();
    expect([aboard.talk, aboard.bag > 0]).toEqual(["abduction", true]);
    expect(refusal(aboard, "pick", { choice: 0, tick: aboard.tick })).toBe(
      "you need glow sticks and a pizza",
    );
    bot.pick(1);
    const traded = bot.here();
    const value = Math.floor(
      (aboard.bag * priceAt(aboard.seed, 2, aboard.tick) * tradeTimes) / 100,
    );
    expect(traded.pocket).toBe(aboard.pocket + value);
    expect([traded.bag, traded.done.includes("traded")]).toEqual([0, true]);
    const quiet = intoBeam([], true);
    quiet.pick(2);
    expect(quiet.here().cause).toBe("abducted");
  });

  it("are left for the shops on other days: a gift is marked once however often it is bought", () => {
    const day: Draft = { ...started(3, 7, 1), pocket: 100 };
    expect([counter(day, "pizza"), counter(day, "pizza")]).toEqual([
      null,
      null,
    ]);
    expect(day.done.filter((id) => id === "item-pizza")).toHaveLength(1);
    expect(invading({ ...day, tick: invasionTick })).toBe(false);
  });
});
