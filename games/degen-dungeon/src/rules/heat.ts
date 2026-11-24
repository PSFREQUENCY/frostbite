import {
  fateDun,
  heatPerStar,
  maxHeat,
  rankFloors,
  tuxStars,
} from "./constants.ts";
import type { DayState, Draft } from "./types.ts";

// Heat, and what is read from money: the stars shown, the rank a net worth earns.
export const starsOf = (heat: number): number =>
  Math.min(5, Math.floor(heat / heatPerStar));

// The freezer does not show on the morning of the drain until the hideout terminal is checked.
export const worthOf = (
  day: Pick<DayState, "fake" | "freezer" | "maxx" | "pocket">,
): number => (day.fake ? 0 : day.freezer) + day.maxx + day.pocket;

// 0 is Newbie, 5 is Whale.
export const rankOf = (
  day: Pick<DayState, "fake" | "freezer" | "maxx" | "pocket">,
): number => rankFloors.filter((floor) => worthOf(day) >= floor).length - 1;

export function heated(day: Draft, by: number): void {
  day.heat = Math.min(maxHeat, day.heat + by);
  day.peak = Math.max(day.peak, day.heat);
}

// Heat going down. Getting from three stars or more to none is shaking the tuxes off.
export function cooled(day: Draft, by: number): void {
  day.heat = Math.max(0, day.heat - by);
  if (day.heat === 0 && day.peak >= tuxStars * heatPerStar) day.shook = true;
}

// What a day counts for: what it made and caught, and on a trip back, what the bent timeline adds or takes (never below nothing).
export const scoreOf = (
  day: Pick<DayState, "fate" | "made" | "storm">,
): number => Math.max(0, day.made + day.storm + day.fate * fateDun);
