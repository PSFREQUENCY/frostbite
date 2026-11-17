import { Group } from "three";
import { describe, expect, it } from "vitest";

import { heatPerStar } from "../src/rules/constants.ts";
import { degenRules } from "../src/rules/index.ts";
import {
  changeOf,
  findOf,
  machines,
  outfitCool,
  wash,
  washCost,
  washerId,
} from "../src/rules/laundry.ts";
import { rooms } from "../src/rules/rooms.ts";
import type { DayState, Draft } from "../src/rules/types.ts";
import { buildShopMotion } from "../src/view/shop-motion.ts";
import { started } from "./support/replay.ts";

const laundry = rooms.find((room) => room.kind === "laundry");
if (laundry === undefined) throw new Error("no laundromat");
const first = washerId(laundry.id, 0);
const at = (state: DayState): Draft => ({
  ...state,
  x: laundry.counter.x,
  z: laundry.counter.z,
});

describe("the laundromats' washing machines", () => {
  it("turn up loose change, a clean outfit or lint by the day's luck, each machine its own", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed < 60; seed += 1)
      for (let index = 0; index < machines; index += 1)
        seen.add(findOf(seed, washerId(laundry.id, index)));
    expect([...seen].sort()).toEqual(["change", "clothes", "lint"]);
    for (let seed = 1; seed < 30; seed += 1) {
      const change = changeOf(seed, first);
      expect(change >= 10 && change <= 40).toBe(true);
    }
  });

  it("take the price, give what the drum turned up, and tell of it in a short talk", () => {
    for (let seed = 1; seed < 40; seed += 1) {
      const day: Draft = {
        ...at(started(seed, 7, 1)),
        heat: heatPerStar * 2,
        pocket: 100,
      };
      expect(wash(day)).toBeNull();
      const find = findOf(day.seed, first);
      expect(day.talk).toBe(`wash-${find}`);
      expect(day.done).toContain(first);
      expect(day.pocket).toBe(
        100 - washCost + (find === "change" ? changeOf(day.seed, first) : 0),
      );
      expect(day.heat).toBe(
        heatPerStar * 2 - (find === "clothes" ? outfitCool : 0),
      );
    }
  });

  it("fill one machine after another, five a day, and not for someone without the price or outside a laundromat", () => {
    const day: Draft = { ...at(started(4, 7, 1)), pocket: 1_000 };
    for (let index = 0; index < machines; index += 1) {
      expect(wash(day)).toBeNull();
      expect(day.done.at(-1)).toBe(washerId(laundry.id, index));
    }
    expect(wash(day)).toBe("every machine has done its wash today");
    expect(wash({ ...at(started(4, 7, 1)), pocket: washCost - 1 })).toBe(
      "not enough DUN",
    );
    expect(wash({ ...started(4, 7, 1), pocket: 100, x: 0, z: 0 })).toBe(
      "there are no washers here",
    );
  });

  it("are run from the laundromat's counter, and the talk closes with its answer", () => {
    const pick = (state: DayState, choice: number): DayState => {
      const result = degenRules.step(state, {
        data: { choice, tick: 1 },
        type: "pick",
      });
      if (!result.ok) throw new Error(result.reason);
      return result.state;
    };
    const day = { ...at(started(9, 7, 1)), pocket: 100 };
    const acted = degenRules.step(day, { data: { tick: 0 }, type: "act" });
    if (!acted.ok) throw new Error(acted.reason);
    expect(acted.state.talk).toBe("shop-laundry");
    const washed = pick(acted.state, 1);
    expect(washed.talk).toBe(`wash-${findOf(day.seed, first)}`);
    expect(washed.done).toContain(first);
    expect(pick(washed, 0).talk).toBeNull();
    // The counter's own wash and change keeps the shop open.
    expect(pick(acted.state, 0).talk).toBe("shop-laundry");
  });
});

describe("the shops at work", () => {
  it("spin a drum hard after a wash and then stop it, turn it again the next day, flicker screens and lift steam, but only near the hero", () => {
    const motion = buildShopMotion();
    expect(motion.root).toBeInstanceOf(Group);
    const drum = motion.root.getObjectByName(first);
    expect(drum).toBeDefined();
    const [x, z] = [laundry.counter.x / 100, laundry.counter.z / 100];
    motion.show(x, z, 1, []);
    motion.show(x, z, 1.1, []);
    const idle = drum?.rotation.x ?? 0;
    expect(idle).toBeGreaterThan(0);
    motion.show(x, z, 1.2, [first]);
    motion.show(x, z, 1.3, [first]);
    const busy = (drum?.rotation.x ?? 0) - idle;
    expect(busy).toBeGreaterThan(0.5);
    for (let t = 1.4; t < 9; t += 0.1) motion.show(x, z, t, [first]);
    const stopped = drum?.rotation.x ?? 0;
    motion.show(x, z, 9.1, [first]);
    expect(drum?.rotation.x).toBe(stopped);
    // Far away, nothing near the hero is moved.
    motion.show(0, 0, 20, [first]);
    expect(drum?.rotation.x).toBe(stopped);
    // A new day: the machine turns with somebody else's load again.
    motion.show(x, z, 20.1, []);
    expect(drum?.rotation.x).toBeGreaterThan(stopped);
    const arcade = rooms.find((room) => room.kind === "arcade");
    const coffee = rooms.find((room) => room.kind === "coffee");
    for (const room of [arcade, coffee])
      motion.show(
        (room?.counter.x ?? 0) / 100,
        (room?.counter.z ?? 0) / 100,
        30,
        [],
      );
  });
});
