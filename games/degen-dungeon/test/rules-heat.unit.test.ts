import { describe, expect, it } from "vitest";

import {
  copFine,
  copGap,
  copPace,
  frozenFine,
  maxHeat,
  stormStart,
  stormTicks,
} from "../src/rules/constants.ts";
import { advance, gust } from "../src/rules/day.ts";
import { cooled, heated, rankOf, starsOf } from "../src/rules/heat.ts";
import { degenRules } from "../src/rules/index.ts";
import { statusOf } from "../src/rules/status.ts";
import { started } from "./support/replay.ts";

// Day two, so the first morning's riot plays no part.
const day = started(1, 7, 2);
const worth = { fake: false, freezer: 0, maxx: 0 };

describe("heat", () => {
  it("is a star a hundred points, five at most, and fades a point a second (fast under the city)", () => {
    expect([0, 99, 100, 345, 900].map(starsOf)).toEqual([0, 0, 1, 3, 5]);
    const hot = { ...day, heat: 480, peak: 480 };
    heated(hot, 100);
    expect([hot.heat, hot.peak]).toEqual([maxHeat, maxHeat]);
    expect(advance({ ...day, heat: 120 }, 90).heat).toBe(117);
    expect(advance({ ...day, heat: 120, talk: "hideout" }, 90).heat).toBe(111);
    expect(advance({ ...day, heat: 120, talk: "lying" }, 90).heat).toBe(90);
    const fading = { ...day, heat: 40, peak: 40 };
    cooled(fading, 60);
    expect([fading.heat, fading.shook]).toEqual([0, false]);
  });

  it("at two stars sends a beat cop on a scooter, who fines the hero and lets them go", () => {
    const wanted = { ...day, heat: 250, peak: 250, pocket: 400 };
    expect(advance(wanted, 1).cop).toEqual({
      x: wanted.x - copGap + copPace,
      z: wanted.z,
    });
    const fined = advance(wanted, 400);
    expect([fined.ended, fined.cop]).toEqual([false, null]);
    expect(fined.heat).toBeLessThanOrEqual(100);
    expect(fined.pocket).toBe(400 - copFine);
    expect(advance({ ...wanted, talk: "hideout" }, 400).pocket).toBe(400);
    expect(advance({ ...day, heat: 150 }, 1).cop).toBeNull();
  });

  it("at three stars brings a tux that walks straight in and freezes what it reaches: the loot goes back and a fine is paid", () => {
    const wanted = {
      ...day,
      heat: 320,
      hot: 600,
      peak: 320,
      pocket: 400,
      talk: "offer-kiki",
    };
    const seen = advance(wanted, 1);
    expect([seen.tux, seen.cop]).toEqual([
      { x: wanted.x - 3_000 + 12, z: wanted.z },
      null,
    ]);
    const caught = advance(wanted, 600);
    expect([
      caught.cause,
      caught.ended,
      caught.hot,
      caught.pocket,
      caught.talk,
    ]).toEqual(["frozen", true, 0, 400 - frozenFine, null]);
    expect(caught.tick).toBeLessThan(300);
    expect(degenRules.earned(caught)).not.toContain("shook-the-tuxes");
    expect(advance({ ...wanted, x: 1_000 }, 1).tux?.x).toBe(4_000 - 12);
    expect(advance({ ...wanted, pocket: 100 }, 600).pocket).toBe(0);
    expect(advance({ ...wanted, talk: "lying" }, 600).ended).toBe(false);
  });

  it("cannot reach a helicopter in the air at three stars, can at four, stands down under three, and is shaken off when the heat is gone", () => {
    const flying = { ...day, level: 1, ride: "heli" as const };
    const three = advance({ ...flying, heat: 399, peak: 399 }, 300);
    expect([three.ended, three.tux === null]).toEqual([false, false]);
    expect(advance({ ...flying, heat: 500, peak: 500 }, 900).cause).toBe(
      "frozen",
    );
    const cooling = { ...day, heat: 301, peak: 301, tux: { x: 0, z: 0 } };
    expect(advance(cooling, 61).tux).toBeNull();
    const calm = { ...day, heat: 30, peak: 300 };
    cooled(calm, 30);
    expect(calm.shook).toBe(true);
  });
});

describe("the Great Airdrop", () => {
  const stormy = { ...started(5, 0, 3), dir: 4, x: 32_500, z: 18_000 };

  it("falls only on its day and in its minute, the same for a seed, thickest in the Swap Meet and wider with the tools", () => {
    expect(gust(5, 100, 100, 0)).toBe(gust(5, 900, 900, 149));
    const falls = new Set(
      Array.from({ length: 60 }, (_, at) => gust(5, at * 1_000, 0, 0)),
    );
    expect(Math.min(...falls)).toBe(0);
    expect(Math.max(...falls)).toBe(7);
    expect(advance(stormy, stormStart - 1).storm).toBe(0);
    const bare = advance(stormy, stormStart + stormTicks + 50);
    expect(bare.storm).toBeGreaterThanOrEqual(8 * stormTicks);
    expect(bare.pocket).toBe(bare.storm);
    expect(advance(bare, bare.tick + 100).storm).toBe(bare.storm);
    expect(
      advance({ ...stormy, tools: 3 }, stormStart + stormTicks).storm,
    ).toBe(bare.storm * 8);
    expect(
      advance({ ...stormy, tools: 1 }, stormStart + stormTicks).storm,
    ).toBe(bare.storm * 3);
    expect(
      advance({ ...stormy, x: 6_000 }, stormStart + stormTicks).storm,
    ).toBeLessThan(bare.storm);
    expect(advance({ ...stormy, dir: -1 }, stormStart + stormTicks).storm).toBe(
      0,
    );
    expect(advance({ ...stormy, day: 1 }, stormStart + stormTicks).storm).toBe(
      0,
    );
  });
});

describe("rank and status", () => {
  it("rank follows net worth: pocket, freezer and MAXX together, with the freezer hidden on the morning of the drain", () => {
    expect(
      [0, 999, 1_000, 5_000, 25_000, 100_000, 500_000].map((pocket) =>
        rankOf({ ...worth, pocket }),
      ),
    ).toEqual([0, 0, 1, 2, 3, 4, 5]);
    expect(rankOf({ ...worth, freezer: 600, pocket: 400 })).toBe(1);
    expect(rankOf({ ...worth, maxx: 5_000, pocket: 0 })).toBe(2);
    expect(rankOf({ ...worth, fake: true, freezer: 9_000, pocket: 0 })).toBe(0);
  });

  it("status is the first thing that is true of how the day has gone", () => {
    const cases: readonly [Partial<typeof day>, string][] = [
      [{}, "GM"],
      [{ freezer: 1_000, pocket: 0 }, "SAFU"],
      [{ gigs: 5 }, "GRINDER"],
      [{ crew: [1, 2], gigs: 5, rep: 60 }, "WAGMI"],
      [{ grass: true }, "TOUCHING GRASS"],
      [{ grass: true, warned: 1 }, "BASED"],
      [{ done: ["diamond"], warned: 1 }, "DIAMOND HANDS"],
      [{ freezer: 0, pocket: 100 }, "DOWN BAD"],
      [{ paperHands: 3 }, "PAPER HANDS"],
      [{ allIns: 3, paperHands: 3 }, "DEGEN"],
      [{ bag: 10, paid: 1_000 }, "BAGHOLDER"],
      [{ topped: 1 }, "EXIT LIQUIDITY"],
      [{ rugged: 1, topped: 1 }, "RUGGED"],
      [{ peakPocket: 20_000, rugged: 1 }, "REKT"],
      [{ heat: 300, peakPocket: 10_000 }, "FUDDED"],
    ];
    for (const [change, word] of cases)
      expect(statusOf({ ...day, ...change })).toBe(word);
  });
});
