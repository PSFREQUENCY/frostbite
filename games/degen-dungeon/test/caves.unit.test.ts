import { describe, expect, it } from "vitest";

import {
  beams,
  gemPrice,
  inBazaar,
  shardPrice,
  underground,
} from "../src/rules/caves.ts";
import { degenRules } from "../src/rules/index.ts";
import { spotNamed } from "../src/rules/places.ts";
import type { DayState } from "../src/rules/types.ts";
import { onStreet } from "../src/rules/world.ts";
import { buildCaves } from "../src/view/caves.ts";
import { caveFloor, hillAt } from "../src/view/hill.ts";
import { createBot } from "./support/bot.ts";
import { refusal, started } from "./support/replay.ts";

const pick = (day: DayState, talk: string, choice: number): DayState => {
  const stepped = degenRules.step(
    { ...day, talk },
    { data: { choice, tick: day.tick }, type: "pick" },
  );
  if (!stepped.ok) throw new Error(stepped.reason);
  return stepped.state;
};
const at = (id: string): { x: number; z: number } => {
  const spot = spotNamed(id);
  return { x: spot?.x ?? 0, z: spot?.z ?? 0 };
};

describe("the crystal caves and the Underground Bazaar", () => {
  it("open from the island's south-east corner into caves that wind east and down to the bazaar's back door", () => {
    const bot = createBot(1, 7, 3);
    bot.use("cave-mouth");
    bot.pick(0);
    const inside = bot.state();
    expect([underground(inside.x, inside.z), inside.done]).toEqual([
      true,
      expect.arrayContaining(["caves"]),
    ]);
    // Walk east through the tunnel and the grotto to the bazaar, the back way: the guard steps in.
    bot.leg("x", 136_600);
    expect(bot.here().talk).toBe("bazaar-guard");
    bot.pick(0);
    const out = bot.state();
    expect([onStreet(out.x, out.z), out.done]).toEqual([
      true,
      expect.arrayContaining(["bazaar-back", "kicked-out"]),
    ]);
    // Walls: off the way underground is nowhere to stand.
    expect(underground(121_000, 2_000)).toBe(false);
    expect([inBazaar(137_000, 6_000), inBazaar(133_000, 6_000)]).toEqual([
      true,
      false,
    ]);
  });

  it("lets the main door's stairs in, where the traders buy gems and sell crystal shards, and the stairs lead back up", () => {
    const day = {
      ...started(1, 2, 3),
      done: ["gem-10", "gem-20"],
      pocket: 200,
    };
    const down = pick({ ...day, ...at("bazaar-stairs") }, "bazaar-stairs", 0);
    expect([inBazaar(down.x, down.z), down.done]).toEqual([
      true,
      expect.arrayContaining(["bazaar-main"]),
    ]);
    // Through the main door, the back way is no trouble.
    const strolled = degenRules.step(down, {
      data: { dir: 8, tick: down.tick },
      type: "move",
    });
    expect(strolled.ok && strolled.state.talk).toBeNull();
    const sold = pick(down, "trader-gems", 0);
    expect(sold.pocket).toBe(200 + gemPrice * 2);
    expect(
      refusal({ ...sold, talk: "trader-gems" }, "pick", { choice: 0, tick: 0 }),
    ).toBe("no gems to sell: a miner digs them up");
    expect(pick(down, "trader-crystals", 0).pocket).toBe(200 - shardPrice);
    expect(
      refusal({ ...down, pocket: 0, talk: "trader-crystals" }, "pick", {
        choice: 0,
        tick: 0,
      }),
    ).toBe("not enough DUN");
    const up = pick(down, "bazaar-up", 0);
    expect(onStreet(up.x, up.z)).toBe(true);
    const climbed = pick({ ...day, ...at("cave-out") }, "cave-out", 0);
    expect(onStreet(climbed.x, climbed.z)).toBe(true);
  });

  it("sends the hero's light from the Light Re-emitter to home, the DEX, the amphitheater, the caves or the bazaar", () => {
    const day = { ...started(1, 7, 3), ...at("emitter") };
    beams(7).forEach((place, index) => {
      const sent = pick(day, "emitter", index);
      expect([sent.x, sent.z, sent.done]).toEqual([
        place.x,
        place.z,
        ["beamed"],
      ]);
      expect(onStreet(sent.x, sent.z)).toBe(true);
    });
  });

  it("goes down underground in the view, crystals along the way, the patrons staring at a back-door visitor", () => {
    expect([caveFloor(1_200), caveFloor(1_300), caveFloor(1_400)]).toEqual([
      -0, -5, -8,
    ]);
    expect(hillAt(1_300, 60)).toBe(-5);
    const caves = buildCaves();
    expect(caves.root.getObjectByName("cave-crystals")).toBeDefined();
    const day = {
      ...started(1, 7, 3),
      done: ["bazaar-back"],
      x: 137_000,
      z: 6_000,
    };
    caves.show(day, 1);
    caves.show(day, 1.2);
    expect(
      caves.root.getObjectByName("light-re-emitter")?.rotation.y,
    ).toBeCloseTo(1.8);
    caves.show(null, 2);
    expect(caves.root.visible).toBe(false);
  });
});
