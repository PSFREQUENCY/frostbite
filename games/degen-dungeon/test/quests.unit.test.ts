// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import { packOf } from "../src/page/bag.ts";
import { createToasts } from "../src/page/toasts.ts";
import { afterDay, freshProgress, nextRun } from "../src/progress.ts";
import { eraOf, eras, lastDay, moonNight } from "../src/rules/calendar.ts";
import { degenRules } from "../src/rules/index.ts";
import { stake } from "../src/rules/moonshot.ts";
import { spots } from "../src/rules/places.ts";
import { bit } from "../src/rules/spot.ts";
import type { DayState } from "../src/rules/types.ts";
import { sideLabels } from "../src/script/sides.ts";
import { sidesOf } from "../src/sides.ts";
import { started } from "./support/replay.ts";

// What finishes every side quest of each day but the letters, as a day's state.
const finishing: readonly Partial<DayState>[] = [
  { done: ["riot", "did-read", "purse-returned", "heroword-7", "wall"] },
  { done: ["did-live", "game-claw"], gigs: 3, rides: 8, words: 3 },
  { done: ["did-dance", "item-glow", "contact"], maxx: 50, spotted: 1 },
  {
    done: ["did-skate", "washer-room-1-3-0", "stash", "window-1-1-1"],
    storm: 9,
  },
  {
    done: ["did-vr", "fit-shades", "home-studio", `recruit-${String(bit)}`],
    warned: 1,
  },
  { done: ["did-film", "staked", "roof", "did-track", "lantern"] },
  {
    done: [
      "did-exhibits",
      "semi-2",
      "bike-1",
      "car-2",
      "moto-3",
      "scooter-4",
      "van-5",
      "did-print",
    ],
    grass: true,
  },
];

describe("the calendar", () => {
  it("lays seven story days over five eras, and opens a place by its eras", () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8].map(eraOf)).toEqual([
      1, 1, 2, 3, 4, 5, 5, 1,
    ]);
    expect(eras(1)).toBe((1 << 1) | (1 << 2));
    expect(eras(5)).toBe((1 << 6) | (1 << 7));
    expect([lastDay, moonNight]).toEqual([7, 6]);
  });
});

describe("the side quests", () => {
  it("are six a day, S's three letters first, none of them done on waking, and none on a trip back", () => {
    for (let day = 1; day <= lastDay; day += 1) {
      const sides = sidesOf(started(1, 7, day));
      expect(sides, `day ${String(day)}`).toHaveLength(6);
      expect(sides.map(({ label }) => label).slice(1)).toEqual(
        sideLabels[day - 1],
      );
      expect(sides.filter(({ done }) => done)).toEqual([]);
      expect(sides[0]?.count).toEqual([0, 3]);
    }
    expect(sidesOf({ ...started(1, 7, 1), loop: 1 })).toEqual([]);
  });

  it("are each read from what the day has done, counted ones with how far along they are", () => {
    finishing.forEach((more, index) => {
      const day = started(1, 7, index + 1);
      const letters = spots
        .filter(
          (spot) =>
            spot.kind === "letter" &&
            spot.on !== undefined &&
            (spot.on & (1 << (index + 1))) !== 0,
        )
        .map(({ id }) => id);
      const sides = sidesOf({
        ...day,
        ...more,
        done: [...letters, ...(more.done ?? [])],
      });
      expect(
        sides.map(({ done }) => done),
        `day ${String(index + 1)}`,
      ).toEqual([true, true, true, true, true, true]);
    });
    const half = sidesOf({ ...started(1, 7, 2), gigs: 2, rides: 9 });
    expect([half[3]?.count, half[3]?.done, half[4]?.count]).toEqual([
      [2, 3],
      false,
      [8, 8],
    ]);
  });
});

describe("the quest log and the cheers", () => {
  it("lists today's three quests, ticked, the one on marked, then the side quests; a trip back has only its line", () => {
    const day = { ...started(1, 7, 2), gigs: 1 };
    const pack = Object.fromEntries(packOf(day));
    expect(pack["Day 2 of 7: quests"]?.map((line) => line.slice(0, 1))).toEqual(
      ["✓", "→", "○"],
    );
    expect(pack["Side quests: 0 of 6"]?.[0]).toBe(
      "○ Find S's three letters on today's avenues (0/3)",
    );
    const trip = Object.fromEntries(packOf({ ...day, loop: 1 }));
    expect(trip.Quest).toHaveLength(1);
  });

  it("cheer a quest or a side quest the moment it is done, but nothing on waking, and start again on a new day", () => {
    const card = document.createElement("aside");
    const toasts = createToasts(card);
    toasts.show(null, 0);
    const morning = { ...started(1, 7, 1), done: ["riot"] };
    toasts.show(morning, 0);
    expect(card.hidden).toBe(true);
    toasts.show({ ...morning, done: ["riot", "speech"], tick: 30 }, 100);
    expect([card.hidden, card.textContent]).toEqual([
      false,
      "QUEST 1 OF 3 DONEHear Frost's speech on the steps of the Global DEX.",
    ]);
    toasts.show(
      { ...morning, done: ["riot", "speech", "purse-returned"], tick: 60 },
      200,
    );
    expect(card.querySelector(".head")?.textContent).toBe(
      "SIDE QUEST 2 OF 6 DONE",
    );
    toasts.show(
      { ...morning, done: ["riot", "speech", "purse-returned"], tick: 90 },
      9_000,
    );
    expect(card.hidden).toBe(true);
    // A new day: what is already done is only noted.
    toasts.show({ ...started(1, 7, 2), gigs: 1 }, 9_100);
    expect(card.hidden).toBe(true);
    toasts.show({ ...started(1, 7, 2), loop: 1 }, 9_200);
    expect(card.hidden).toBe(true);
  });
});

describe("what carries between days", () => {
  it("keeps Moon Night's dream for the last day, as a setting the rules check", () => {
    const night = {
      ...started(1, 7, moonNight),
      cause: "home" as const,
      dream: 2,
    };
    const kept = afterDay(freshProgress, night).progress;
    expect(kept.dream).toBe(2);
    expect(nextRun({ ...kept, day: lastDay }).dream).toBe(2);
    expect(afterDay(kept, { ...night, cause: "abducted" }).progress.dream).toBe(
      0,
    );
    const last = degenRules.init(1, { day: lastDay, dream: 2, hero: 7 });
    expect(last.ok && last.state.dream).toBe(2);
    for (const config of [
      { day: moonNight, dream: 1, hero: 7 },
      { day: lastDay, dream: 3, hero: 7 },
    ])
      expect(degenRules.init(1, config)).toEqual({
        ok: false,
        reason: "a dream is 1 or 2, carried into the last day",
      });
  });

  it("remembers a moonshot staked today, once", () => {
    const day = { ...started(1, 7, moonNight), pocket: 50_000 };
    expect(stake(day, 0)).toBeNull();
    expect(day.done.filter((id) => id === "staked")).toEqual(["staked"]);
  });
});
