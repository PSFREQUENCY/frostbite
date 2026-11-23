// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import { createMeters, metersOf } from "../src/page/meters.ts";
import { tillCap } from "../src/rules/business.ts";
import {
  nightTick,
  powerCooldown,
  rankFloors,
} from "../src/rules/constants.ts";
import { hungerTicks } from "../src/rules/food.ts";
import type { DayState } from "../src/rules/types.ts";
import { started } from "./support/replay.ts";

const ids = (day: DayState): readonly string[] =>
  metersOf(day).map(({ id }) => id);
const find = (day: DayState, id: string) =>
  metersOf(day).find((meter) => meter.id === id);

describe("the neon meters", () => {
  it("show the day's quests in lit units, the side quests, the power, how full the hero is, the shop and the next rank", () => {
    const day = { ...started(1, 7, 3), tick: 900 };
    expect(ids(day)).toEqual([
      "rent",
      "quests",
      "sides",
      "power",
      "full",
      "shop",
      "skills",
      "rank",
    ]);
    expect(find(day, "quests")).toMatchObject({
      have: 0,
      need: 3,
      units: true,
    });
    expect(find(day, "power")?.text).toBe("ready");
    expect(find({ ...day, powerAt: 900 - 30 }, "power")?.text).toBe(
      `${String((powerCooldown - 30) / 30)}s`,
    );
    expect(find(day, "shop")).toMatchObject({ have: 90, need: tillCap });
    // Hungry, the meter pulses; at the top rank the bar is full.
    expect(
      find({ ...day, ateAt: day.tick - hungerTicks }, "full"),
    ).toMatchObject({ have: 0, warn: true });
    expect(find({ ...day, pocket: rankFloors[5] ?? 0 }, "rank")).toMatchObject({
      have: 1,
      need: 1,
      text: "top",
    });
    // On day one the skills cannot be mastered yet, and with nothing sold the shop stays off.
    expect(ids({ ...started(1, 7, 1), tick: 0 })).not.toContain("skills");
    expect(ids({ ...started(1, 7, 1), tick: 0 })).not.toContain("shop");
  });

  it("put what lasts on top: the flight, the board, a stream, a beam and a Degen Dash, and the rent while owed", () => {
    const day = { ...started(1, 1, 3), tick: 3_000 };
    const busy: DayState = {
      ...day,
      beamed: 20,
      dash: 3,
      dashFrom: 2_000,
      flyUntil: 3_060,
      ride: "board",
      skated: 75,
      streamFrom: 2_100,
    };
    expect(ids(busy).slice(0, 6)).toEqual([
      "flight",
      "skate",
      "stream",
      "beam",
      "dash",
      "rent",
    ]);
    expect(find(busy, "flight")).toMatchObject({ text: "2s", warn: true });
    expect(find(busy, "dash")).toMatchObject({ have: 3, need: 9, units: true });
    // Short of the rent: red, pulsing in the last two minutes; then green once the pocket covers it.
    const late = { ...day, pocket: 10, tick: nightTick - 60 };
    expect(find(late, "rent")).toMatchObject({ hue: "#ff4d5e", warn: true });
    expect(find({ ...late, pocket: 10_000 }, "rent")?.hue).toBe("#39e27d");
    expect(ids({ ...late, done: ["rent-paid"] })).not.toContain("rent");
  });

  it("draw bars and units on the page, and leave the page alone while nothing changes", () => {
    const box = document.createElement("div");
    const meters = createMeters(box);
    meters.render(null);
    expect(box.hidden).toBe(true);
    const day = { ...started(1, 7, 3), tick: 900 };
    meters.render(day);
    expect(box.hidden).toBe(false);
    const quests = box.querySelector('[data-id="quests"]');
    expect(quests?.querySelectorAll(".neon-units i")).toHaveLength(3);
    const shop = box.querySelector('[data-id="shop"] .neon-track i');
    expect(shop instanceof HTMLElement ? shop.style.inlineSize : "").toBe("3%");
    const first = box.firstElementChild;
    meters.render(day);
    expect(box.firstElementChild).toBe(first);
    meters.render({ ...day, ateAt: day.tick - hungerTicks });
    expect(
      box.querySelector('[data-id="full"]')?.getAttribute("data-warn"),
    ).toBe("yes");
  });
});
