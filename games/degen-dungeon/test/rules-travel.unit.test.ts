import { describe, expect, it } from "vitest";

import { borrowHeat, fogLine, island, sea } from "../src/rules/constants.ts";
import { advance } from "../src/rules/day.ts";
import { paceOf, units } from "../src/rules/move.ts";
import {
  dockLand,
  dockWater,
  helipad,
  inSwapMeet,
  nearest,
  onLand,
  onWater,
  spots,
} from "../src/rules/world.ts";
import { createBot } from "./support/bot.ts";
import { refusal, started } from "./support/replay.ts";

describe("the island", () => {
  it("has sixteen headings of the same length, and every spot on a street with room to stand", () => {
    for (const [x, z] of units)
      expect(Math.abs(Math.hypot(x, z) - 1_024)).toBeLessThan(2);
    for (const spot of spots.filter(({ id }) => id !== "ride-boat"))
      expect(onLand(spot.x, spot.z), spot.id).toBe(true);
    expect(new Set(spots.map(({ id }) => id)).size).toBe(spots.length);
    expect(nearest(18_000, 18_000)).toBeNull();
    expect(nearest(17_100, 18_050)?.id).toBe("faucet");
  });

  it("keeps feet out of buildings and off the edge, and boats off the shore and inside the sea", () => {
    expect(onLand(14_000, 14_000)).toBe(false);
    expect(onLand(18_000, 14_000)).toBe(true);
    expect(onLand(10, 6_000)).toBe(false);
    expect(onLand(island, 6_000)).toBe(false);
    expect(onWater(dockWater.x, dockWater.z)).toBe(true);
    expect(onWater(dockLand.x, dockLand.z)).toBe(false);
    expect(onWater(-sea - 1, 0)).toBe(false);
    expect(inSwapMeet(32_500, 18_000)).toBe(true);
    expect(inSwapMeet(30_000, 18_000)).toBe(false);
  });
});

describe("walking", () => {
  it("covers the hero's pace a tick, the same in one step or in two, and stops at a wall", () => {
    const day = { ...started(1, 7, 1), dir: 4 };
    const pace = paceOf(day);
    expect(pace).toBe(13);
    expect(advance(day, 10).z).toBe(15_500 + 10 * pace);
    expect(advance(advance(day, 40), 90)).toEqual(advance(day, 90));
    expect(advance(day, 0)).toBe(day);
    const west = advance({ ...day, dir: 8 }, 200);
    expect(west.x).toBeGreaterThan(17_040);
    expect(west.x).toBeLessThan(17_060);
  });

  it("slides along a wall on a slant, stops at the shore, and waits while an offer is open", () => {
    const slant = advance({ ...started(1, 7, 1), dir: 10 }, 200);
    expect(slant.x).toBeGreaterThan(17_040);
    expect(slant.z).toBeLessThan(15_500 - 1_000);
    expect(advance({ ...started(1, 6, 1), dir: 12 }, 2_000).z).toBeLessThan(60);
    const asked = { ...started(1, 7, 1), dir: 4, talk: "offer-kiki" };
    expect(advance(asked, 50).z).toBe(asked.z);
  });
});

describe("rides", () => {
  it("are faster than feet; one above your rank is borrowed, which is stealing", () => {
    const bot = createBot(1, 5, 1);
    bot.use("ride-scooter");
    expect([bot.state().ride, bot.state().heat, paceOf(bot.state())]).toEqual([
      "scooter",
      borrowHeat,
      22,
    ]);
    expect(refusal(bot.state(), "act", { tick: bot.state().tick })).toBeNull();
    bot.act();
    expect(bot.state().ride).toBe("foot");
    const owner = createBot(1, 5, 3);
    owner.use("ride-scooter");
    expect(owner.state().heat).toBe(0);
    owner.hold(4, 30);
    owner.act();
    expect(owner.state().ride).toBe("foot");
    expect(refusal(owner.state(), "act", { tick: owner.state().tick })).toBe(
      "nothing to do here",
    );
  });

  it("cannot be swapped without stepping off, and the train takes no rides", () => {
    const bot = createBot(1, 5, 3);
    bot.use("ride-scooter");
    bot.go(30_000, 32_500);
    expect(refusal(bot.here(), "act", { tick: bot.here().tick })).toBe(
      "the train takes people, not rides",
    );
    bot.go(6_000, 13_500);
    expect(refusal(bot.here(), "act", { tick: bot.here().tick })).toBe(
      "leave the ride you are on first",
    );
    expect(bot.here().rides).toBe(0);
  });

  it("a boat leaves from the dock, keeps to the water, is turned round in the fog and lands its rider ashore", () => {
    const bot = createBot(1, 6, 1);
    bot.use("ride-boat");
    expect([bot.state().ride, bot.state().x, bot.state().z]).toEqual([
      "boat",
      dockWater.x,
      dockWater.z,
    ]);
    bot.hold(4, 60);
    expect(bot.here().z).toBeLessThan(-200);
    bot.hold(0, 100);
    expect(refusal(bot.here(), "act", { tick: bot.here().tick })).toBe(
      "nothing to do here",
    );
    bot.hold(12, 200);
    expect([bot.here().x, bot.here().z, bot.here().dir]).toEqual([
      dockWater.x,
      dockWater.z,
      -1,
    ]);
    expect(bot.here().z).toBeGreaterThan(fogLine);
    bot.act();
    expect([bot.state().ride, bot.state().x, bot.state().z]).toEqual([
      "foot",
      dockLand.x,
      dockLand.z,
    ]);
  });

  it("a helicopter climbs a level at a time, flies over buildings, lands only on open ground and is turned round in the fog", () => {
    const bot = createBot(1, 7, 1);
    bot.use("ride-heli");
    expect(bot.state().ride).toBe("heli");
    const parked = bot.here().z;
    bot.hold(12, 30);
    expect(bot.here().z).toBe(parked);
    expect(refusal(bot.here(), "lift", { by: -1, tick: bot.here().tick })).toBe(
      "no higher or lower than that",
    );
    bot.lift(1);
    expect(refusal(bot.state(), "act", { tick: bot.state().tick })).toBe(
      "land before stepping out",
    );
    bot.hold(12, 100);
    expect(onLand(bot.here().x, bot.here().z)).toBe(false);
    expect(refusal(bot.here(), "lift", { by: -1, tick: bot.here().tick })).toBe(
      "nowhere to land here",
    );
    bot.lift(1);
    bot.lift(1);
    expect(
      refusal(bot.state(), "lift", { by: 1, tick: bot.state().tick }),
    ).toBe("no higher or lower than that");
    bot.hold(12, 600);
    expect([bot.here().x, bot.here().z, bot.here().level]).toEqual([
      helipad.x,
      helipad.z,
      0,
    ]);
    bot.act();
    expect(bot.state().ride).toBe("foot");
  });
});
