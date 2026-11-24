import { dayFreezers, dayPockets, heatPerStar, tuxStars } from "./constants.ts";
import { priceAt } from "./market.ts";
import type { DayState } from "./types.ts";

// The one word over a player's head: how they have been playing today, worked out from the day and never picked. The first rule that
// holds wins, so the list is in order of what matters most.
const held = (day: DayState): number =>
  day.pocket + day.freezer + day.maxx + day.paid;
const started = (day: DayState): number =>
  day.loop > 0
    ? 0
    : (dayPockets[day.day - 1] ?? 0) + (dayFreezers[day.day - 1] ?? 0);
const bagValue = (day: DayState): number =>
  Math.floor((day.bag * priceAt(day.seed, day.day, day.tick)) / 100);

const rules: readonly {
  readonly holds: (day: DayState) => boolean;
  readonly word: string;
}[] = [
  { holds: (day) => day.heat >= tuxStars * heatPerStar, word: "FUDDED" },
  {
    holds: (day) => day.peakPocket >= 500 && held(day) * 10 < day.peakPocket,
    word: "REKT",
  },
  { holds: (day) => day.rugged > 0, word: "RUGGED" },
  { holds: (day) => day.topped > 0, word: "EXIT LIQUIDITY" },
  {
    holds: (day) => day.bag > 0 && bagValue(day) * 10 <= day.paid,
    word: "BAGHOLDER",
  },
  { holds: (day) => day.allIns >= 3, word: "DEGEN" },
  { holds: (day) => day.paperHands >= 3, word: "PAPER HANDS" },
  { holds: (day) => held(day) * 2 < started(day), word: "DOWN BAD" },
  { holds: (day) => day.done.includes("diamond"), word: "DIAMOND HANDS" },
  { holds: (day) => day.warned > 0, word: "BASED" },
  { holds: (day) => day.grass, word: "TOUCHING GRASS" },
  { holds: (day) => day.crew.length === 2 && day.rep >= 60, word: "WAGMI" },
  { holds: (day) => day.gigs >= 5, word: "GRINDER" },
  {
    holds: (day) =>
      day.pocket === 0 &&
      day.freezer > 0 &&
      day.drain === 0 &&
      (day.day > 1 || day.paper === 2 || day.paper === 4),
    word: "SAFU",
  },
];

export const statusOf = (day: DayState): string =>
  rules.find(({ holds }) => holds(day))?.word ?? "GM";
