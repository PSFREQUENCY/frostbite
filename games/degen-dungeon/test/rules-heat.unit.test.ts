import { describe, expect, it } from "vitest";

import {
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

const day = started(1, 7, 1);

describe("heat", () => {
  it("is a star a hundred points, five at most, and fades a point a second", () => {
    expect([0, 99, 100, 345, 900].map(starsOf)).toEqual([0, 0, 1, 3, 5]);
    const hot = { ...day, heat: 480, peak: 480 };
    heated(hot, 100);
    expect([hot.heat, hot.peak]).toEqual([maxHeat, maxHeat]);
    expect(advance({ ...day, heat: 120 }, 90).heat).toBe(117);
    const fading = { ...day, heat: 40, peak: 40 };
    cooled(fading, 60);
    expect([fading.heat, fading.shook]).toEqual([0, false]);
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
    expect(seen.tux).toEqual({ x: wanted.x - 3_000 + 12, z: wanted.z });
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
  });

  it("cannot reach a helicopter in the air, stands down under three stars, and is shaken off when the heat is gone", () => {
    const flying = advance(
      { ...day, heat: 500, level: 1, peak: 500, ride: "heli" as const },
      900,
    );
    expect([flying.ended, flying.tux === null]).toEqual([false, false]);
    const cooling = { ...day, heat: 301, peak: 301, tux: { x: 0, z: 0 } };
    expect(advance(cooling, 61).tux).toBeNull();
    const calm = { ...day, heat: 30, peak: 300 };
    cooled(calm, 30);
    expect(calm.shook).toBe(true);
  });
});

describe("the Great Airdrop", () => {
  const stormy = { ...started(5, 0, 3), x: 32_500, z: 18_000 };

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
    expect(bare.pocket).toBe(3_000 + bare.storm);
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
    expect(advance({ ...stormy, day: 1 }, stormStart + stormTicks).storm).toBe(
      0,
    );
  });
});

describe("rank and status", () => {
  it("rank follows net worth, pocket and freezer together", () => {
    expect(
      [0, 999, 1_000, 5_000, 25_000, 100_000, 500_000].map((pocket) =>
        rankOf({ freezer: 0, pocket }),
      ),
    ).toEqual([0, 0, 1, 2, 3, 4, 5]);
    expect(rankOf({ freezer: 600, pocket: 400 })).toBe(1);
  });

  it("status is the first thing that is true of how the day has gone", () => {
    expect(statusOf(day)).toBe("GM");
    expect(statusOf({ ...day, freezer: 10 })).toBe("SAFU");
    expect(statusOf({ ...day, gigs: 3 })).toBe("GRINDER");
    expect(statusOf({ ...day, crew: [1, 2], gigs: 3, rep: 20 })).toBe("WAGMI");
    expect(statusOf({ ...day, crew: [1, 2], rep: 20, spotted: 1 })).toBe(
      "BASED",
    );
    expect(statusOf({ ...day, rugged: 1, spotted: 1 })).toBe("RUGGED");
    expect(statusOf({ ...day, heat: 300, rugged: 1 })).toBe("FUDDED");
  });
});
