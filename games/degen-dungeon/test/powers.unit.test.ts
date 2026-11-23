import { describe, expect, it } from "vitest";

import {
  boostPace,
  heatPerStar,
  powerCooldown,
} from "../src/rules/constants.ts";
import { degenRules } from "../src/rules/index.ts";
import { advance } from "../src/rules/day.ts";
import { flightPace, flightTicks, flying, skyOf } from "../src/rules/flight.ts";
import { paceOf } from "../src/rules/move.ts";
import {
  letterNear,
  powerLevel,
  powerOf,
  powers,
} from "../src/rules/powers.ts";
import type { DayState } from "../src/rules/types.ts";
import { onStreet } from "../src/rules/world.ts";
import { buildPowers } from "../src/view/powers.ts";
import { refusal, started } from "./support/replay.ts";

// A hero out on The Exchange's middle street, facing west, the power ready.
const out = (hero: number, more: Partial<DayState> = {}): DayState => ({
  ...started(3, hero, 3),
  facing: 8,
  tick: 1_000,
  x: 16_000,
  z: 18_300,
  ...more,
});
const use = (day: DayState): DayState => {
  const stepped = degenRules.step(day, {
    data: { tick: day.tick },
    type: "power",
  });
  if (!stepped.ok) throw new Error(stepped.reason);
  return stepped.state;
};

describe("the heroes' powers", () => {
  it("give every hero their own, a level for each top skill mastered today up to three, cooling for twenty seconds", () => {
    expect(powers).toHaveLength(10);
    expect([powerOf(0), powerOf(3), powerOf(7), powerOf(8)]).toEqual([
      "sense",
      "breath",
      "charge",
      "strength",
    ]);
    const day = out(7);
    expect(powerLevel(day)).toBe(1);
    expect(
      powerLevel({ ...day, done: ["mastered-a", "mastered-b", "mastered-c"] }),
    ).toBe(3);
    const used = use(day);
    expect(refusal(used, "power", { tick: used.tick })).toBe(
      "your power is still charging",
    );
    expect(
      refusal({ ...used, tick: used.tick + powerCooldown }, "power", {
        tick: used.tick + powerCooldown,
      }),
    ).toBeNull();
    expect(refusal({ ...day, ride: "car" }, "power", { tick: day.tick })).toBe(
      "your power needs your own feet on the ground",
    );
    expect(refusal({ ...day, talk: "home" }, "power", { tick: day.tick })).toBe(
      "answer first",
    );
  });

  it("charges the bull and the ram faster for a while, and points the ram at S's nearest letter", () => {
    const bull = use(out(7));
    expect(paceOf(bull) - paceOf({ ...bull, boostUntil: 0 })).toBe(boostPace);
    const ram = use(out(0));
    expect(ram.senseUntil).toBeGreaterThan(ram.tick);
    expect(letterNear(ram)).not.toBeNull();
  });

  it("flies the dragon ten seconds a level, low over the streets at first and high over everything later, and blinks the wizard", () => {
    const dragon = use(out(1));
    expect(dragon.flyUntil).toBe(dragon.tick + flightTicks);
    expect(paceOf(dragon)).toBe(flightPace(dragon));
    // Low, a building is in the way; high, it flies over.
    expect(skyOf(dragon)(15_000, 17_000)).toBe(false);
    const high = { done: ["mastered-a", "mastered-b"] };
    expect(skyOf(high)(15_000, 17_000)).toBe(true);
    expect(use(out(1, high)).flyUntil).toBe(1_000 + flightTicks * 3);
    // Aloft, nothing is used and nobody reaches it; its power again brings it down.
    expect(refusal(dragon, "act", { tick: dragon.tick })).toBe(
      "land first: use your power again",
    );
    const down = use(dragon);
    expect([down.flyUntil <= down.tick, flying(down)]).toEqual([true, false]);
    // Out of time over a building, it comes down on the nearest open ground.
    const over = advance(
      { ...use(out(1, high)), x: 15_000, z: 17_000 },
      1_000 + flightTicks * 3,
    );
    expect([flying(over), onStreet(over.x, over.z)]).toEqual([false, true]);
    expect(
      refusal({ ...out(1), x: 21_100, z: 14_900 }, "power", { tick: 1_000 }),
    ).toBe("no room to fly in here");
    const wizard = use(out(4));
    expect(16_000 - wizard.x).toBeLessThanOrEqual(500);
    // Facing a wall with nowhere to land.
    expect(
      refusal({ ...out(4), facing: 12, z: 17_100 }, "power", { tick: 1_000 }),
    ).toBe("nowhere open to land that way");
  });

  it("carries the dragon over the sea and the streets while it flies, and nobody on the ground can catch it", () => {
    const dragon = { ...use(out(1)), heat: 400 };
    const stepped = degenRules.step(dragon, {
      data: { dir: 8, tick: dragon.tick },
      type: "move",
    });
    if (!stepped.ok) throw new Error(stepped.reason);
    const going = advance(stepped.state, dragon.tick + 60);
    expect(dragon.x - going.x).toBe(60 * flightPace(dragon));
    expect(going.cop).toBeNull();
  });

  it("gives the dog and the cat frost vision, the cat's longer; digs the miner up DUN now and then; cools the unicorn's heat", () => {
    const dog = use(out(5));
    const cat = use(out(6));
    expect([dog.looking, cat.vision - dog.vision]).toEqual([true, 300]);
    const finds = [1_000, 1_600, 2_200, 2_800, 3_400, 4_000].map(
      (tick) => use(out(2, { tick })).pocket - out(2).pocket,
    );
    expect(finds.some((found) => found > 0)).toBe(true);
    const unicorn = use(out(9, { heat: heatPerStar * 2 }));
    expect(unicorn.heat).toBe(heatPerStar);
  });

  it("freezes whoever is close ahead with the ice giant's breath, and stops the tux and the cop round the bear", () => {
    const giant = out(3);
    const crowd = use({ ...giant, tux: { x: 15_600, z: 18_300 } });
    expect(crowd.frozen.map(({ id }) => id)).toContain("tux");
    const behind = use({ ...giant, tux: { x: 16_500, z: 18_300 } });
    expect(behind.frozen.map(({ id }) => id)).not.toContain("tux");
    const bear = use({ ...out(8), tux: { x: 16_500, z: 18_300 } });
    expect(bear.frozen.map(({ id }) => id)).toEqual(["tux"]);
  });

  it("shows a burst in the power's colour, the frost cone and the ram's beam", () => {
    const view = buildPowers();
    const giant = use(out(3));
    view.show(giant);
    expect(view.root.getObjectByName("power-breath")?.visible).toBe(true);
    view.show({ ...giant, tick: giant.tick + 60 });
    expect(view.root.getObjectByName("power-ring")?.visible).toBe(false);
    view.show(use(out(0)));
    expect(view.root.getObjectByName("power-sense")?.visible).toBe(true);
    view.show(null);
    expect(view.root.visible).toBe(false);
  });
});
