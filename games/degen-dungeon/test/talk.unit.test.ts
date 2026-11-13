import { describe, expect, it } from "vitest";

import { candleTicks, drainPace } from "../src/rules/constants.ts";
import { degenRules } from "../src/rules/index.ts";
import { pricePath, priceAt, topFrom } from "../src/rules/market.ts";
import { below, priceOf } from "../src/rules/talk.ts";
import type { DayState } from "../src/rules/types.ts";
import { refusal, started } from "./support/replay.ts";

// A talk opened by hand, then answered: the state after, or why not.
function answer(day: DayState, talk: string, ...choices: readonly number[]) {
  let state: DayState = { ...day, talk };
  for (const choice of choices) {
    const stepped = degenRules.step(state, {
      data: { choice, tick: state.tick },
      type: "pick",
    });
    if (!stepped.ok) return stepped.reason;
    state = stepped.state;
  }
  return state;
}
const state = (outcome: DayState | string): DayState => {
  if (typeof outcome === "string") throw new Error(outcome);
  return outcome;
};

describe("talks", () => {
  const day = started(3, 7, 4);

  it("home sleeps, or goes down to the hideout, where the freezer, the terminal and lying low are", () => {
    expect(state(answer(day, "home", 0))).toMatchObject({
      cause: "home",
      ended: true,
      talk: null,
    });
    expect(state(answer(day, "home", 2)).talk).toBeNull();
    const down = state(answer(day, "home", 1, 0));
    expect([down.talk, down.pocket, down.freezer, below(down.talk)]).toEqual([
      "hideout",
      0,
      23_000,
      true,
    ]);
    expect(answer(down, "hideout", 0)).toBe("nothing to stash");
    expect(answer(down, "hideout", 1)).toBe("the terminal shows all is well");
    const drained = state(answer({ ...day, drain: drainPace }, "hideout", 1));
    expect([drained.drain, drained.saved]).toEqual([0, true]);
    const fooled = state(
      answer({ ...started(3, 7, 3), pocket: 0 }, "hideout", 1),
    );
    expect([fooled.fake, fooled.saved]).toEqual([false, false]);
    expect(state(answer(day, "hideout", 2)).talk).toBe("lying");
    expect(state(answer(day, "lying", 0)).talk).toBe("hideout");
    expect(state(answer(day, "hideout", 3)).talk).toBeNull();
    expect(answer(day, "hideout", 3, 0)).toBe("nobody asked");
    expect(answer(day, "home", 3)).toBe("no such answer");
  });

  it("the seed paper goes where it is put, and Frost hears about a scam only once it is spotted", () => {
    const first = started(3, 7, 1);
    expect(state(answer(first, "paper", 1))).toMatchObject({
      paper: 2,
      paperAt: 0,
      talk: null,
    });
    expect(answer(day, "frost", 0)).toBe("no scam spotted to report");
    expect(state(answer({ ...day, spotted: 1 }, "frost", 0)).warned).toBe(1);
    expect(answer({ ...day, spotted: 1, warned: 1 }, "frost", 0)).toBe(
      "no scam spotted to report",
    );
    expect(state(answer(day, "frost", 1)).talk).toBeNull();
    expect(state(answer(first, "speech", 0, 0, 0)).done).toContain("speech");
  });

  it("the shops sell once each, for rank and DUN, a fifth dearer with heat, and nothing at four stars", () => {
    expect(priceOf({ heat: 0 }, "fit-parka")).toBe(400);
    expect(priceOf({ heat: 150 }, "fit-parka")).toBe(480);
    expect(priceOf({ heat: 0 }, "a yacht")).toBeNull();
    const shades = state(answer(day, "fits", 1));
    expect([shades.pocket, shades.talk, shades.done]).toEqual([
      2_800,
      "fits",
      ["fit-shades"],
    ]);
    expect(answer(shades, "fits", 1)).toBe("you have that already");
    expect(answer({ ...day, pocket: 50 }, "fits", 1)).toBe("not enough DUN");
    expect(answer(day, "realtor", 2)).toBe("that needs a higher rank");
    expect(state(answer(day, "realtor", 0)).pocket).toBe(1_000);
    expect(answer({ ...day, heat: 400 }, "fits", 0)).toBe(
      "your wallet is locked",
    );
    const painted = state(
      answer({ ...day, heat: 150, peak: 150 }, "garage", 1),
    );
    expect([painted.heat, painted.pocket]).toEqual([50, 3_000 - 240]);
    expect(state(answer(day, "garage", 0)).done).toEqual(["tune"]);
  });

  it("MAXX takes deposits and pays them back only in the mania, and is shut after the winter", () => {
    const mania = started(3, 7, 2);
    const banked = state(answer(mania, "maxx", 0));
    expect([banked.pocket, banked.maxx]).toEqual([0, 600]);
    expect(answer(banked, "maxx", 0)).toBe("nothing to deposit");
    expect(state(answer(banked, "maxx", 1))).toMatchObject({
      maxx: 0,
      pocket: 600,
    });
    expect(answer(mania, "maxx", 1)).toBe("nothing to withdraw");
    const winter = { ...started(3, 7, 3), maxx: 900 };
    expect(answer(winter, "maxx", 1)).toBe(
      "withdrawals are paused for maintenance",
    );
    expect(answer(winter, "maxx", 0)).toBe("MAXX takes no deposits today");
    expect(answer({ ...mania, heat: 450 }, "maxx", 0)).toBe(
      "your wallet is locked",
    );
    const at = { ...day, x: 18_000, z: 22_000 };
    expect(refusal(at, "act", { tick: 0 })).toBe(
      "MAXX is back after maintenance",
    );
    expect(
      refusal({ ...at, heat: 450, x: 10_500, z: 18_000 }, "act", { tick: 0 }),
    ).toBe("your wallet is locked");
  });

  it("the Exchange floor buys small or all in, sells the whole bag, and keeps count of tops and paper hands", () => {
    const path = pricePath(3, 4);
    expect(path).toEqual(pricePath(3, 4));
    expect(path).toHaveLength(60);
    expect(Math.min(...path)).toBeGreaterThanOrEqual(5);
    expect(priceAt(3, 4, candleTicks * 2 + 1)).toBe(path[2]);
    expect(priceAt(3, 4, 999_999)).toBe(path[59]);
    expect(topFrom(3, 4, 0)).toBe(Math.max(...path));
    const small = state(answer(day, "chart", 0));
    expect([small.pocket, small.paid, small.firstBuy, small.allIns]).toEqual([
      2_900, 100, 0, 0,
    ]);
    expect(small.bag).toBe(Math.floor((100 * 100) / (path[0] ?? 1)));
    const all = state(answer(day, "chart", 2));
    expect([all.pocket, all.allIns]).toEqual([0, 1]);
    expect(state(answer({ ...day, fomo: 80 }, "chart", 0)).pocket).toBe(0);
    expect(answer({ ...day, pocket: 0 }, "chart", 0)).toBe(
      "nothing to buy with",
    );
    expect(answer(day, "chart", 1)).toBe("no bag to sell");
    const sold = state(answer({ ...small, tick: 0 }, "chart", 1));
    expect([sold.bag, sold.paid, sold.sells, sold.talk]).toEqual([
      0,
      0,
      1,
      "chart",
    ]);
    const rich = { ...small, bag: 100_000, paid: 1 };
    expect(state(answer(rich, "chart", 1)).made).toBeGreaterThan(0);
    const topped = path.findIndex((price) => price === Math.max(...path));
    expect(
      state(answer({ ...day, tick: topped * candleTicks }, "chart", 0)).topped,
    ).toBe(1);
    const dips = path.findIndex(
      (price, at) => topFrom(3, 4, (at + 1) * candleTicks) * 2 >= price * 3,
    );
    if (dips >= 0)
      expect(
        state(answer({ ...small, tick: dips * candleTicks }, "chart", 1))
          .paperHands,
      ).toBe(1);
    expect(answer({ ...day, heat: 400 }, "chart", 0)).toBe(
      "your wallet is locked",
    );
  });

  it("frost vision runs down while it is on, and cannot be turned on once it is spent", () => {
    const looking = degenRules.step(day, { data: { tick: 0 }, type: "look" });
    if (!looking.ok) throw new Error(looking.reason);
    expect(looking.state.looking).toBe(true);
    const spent = degenRules.step(
      { ...looking.state, tick: 0 },
      { data: { tick: 500 }, type: "act" },
    );
    expect(spent.ok ? spent.state.vision : -1).toBe(0);
    expect(refusal({ ...day, vision: 0 }, "look", { tick: 0 })).toBe(
      "frost vision is spent for today",
    );
  });
});
