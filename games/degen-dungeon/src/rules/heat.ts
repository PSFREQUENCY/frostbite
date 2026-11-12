import { heatPerStar, maxHeat, rankFloors, tuxStars } from "./constants.ts";
import type { DayState, Draft } from "./types.ts";

// Heat, and what is read from money: the stars shown, the rank a net worth earns.
export const starsOf = (heat: number): number =>
  Math.min(5, Math.floor(heat / heatPerStar));

export const worthOf = (day: Pick<DayState, "freezer" | "pocket">): number =>
  day.freezer + day.pocket;

// 0 is Newbie, 5 is Whale.
export const rankOf = (day: Pick<DayState, "freezer" | "pocket">): number =>
  rankFloors.filter((floor) => worthOf(day) >= floor).length - 1;

export function heated(day: Draft, by: number): void {
  day.heat = Math.min(maxHeat, day.heat + by);
  day.peak = Math.max(day.peak, day.heat);
}

// Heat going down. Getting from three stars or more to none is shaking the tuxes off.
export function cooled(day: Draft, by: number): void {
  day.heat = Math.max(0, day.heat - by);
  if (day.heat === 0 && day.peak >= tuxStars * heatPerStar) day.shook = true;
}
