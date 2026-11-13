import { reach } from "./constants.ts";
import { heroes } from "./heroes.ts";
import { sites } from "./sites.ts";
import { bit, days, type Spot } from "./spot.ts";
import type { DayState, Point } from "./types.ts";
import { at, loop } from "./world.ts";

export { bit, days, type Spot };

// Every place where something can be done. Each stands on a street or an avenue, so anyone can walk to it, and no two that can be open
// on the same day are within reach of each other. `on` is the days a place is open (bit 1 is day one), `hidden` needs frost vision, and
// `only` is for one hero. Adding a place to the game is adding a row here; a new kind of place is a case in `acts.ts`.
const homes: Spot[] = heroes.map((hero, id) => ({
  ...at(hero.borough, hero.hidden ? 2_500 : 0, hero.hidden ? 0 : -2_500),
  hero: id,
  id: `home-${String(id)}`,
  kind: "home",
  label: `${hero.name}'s place`,
}));
// Each hero's own word from the first morning, beside their door, seen only by frost vision.
const heroWords: Spot[] = homes.map((home, id) => ({
  hidden: true,
  id: `heroword-${String(id)}`,
  kind: "heroword",
  label: "Something scratched in the ice",
  on: days(1),
  only: id,
  x: home.x + (heroes[id]?.hidden === true ? 0 : 900),
  z: home.z + (heroes[id]?.hidden === true ? 900 : 0),
}));
const recruits: Spot[] = [
  ...heroes.flatMap((hero, id) =>
    hero.hidden
      ? []
      : [
          {
            ...at(hero.borough, hero.borough === 4 ? -2_000 : -2_500, 0),
            hero: id,
            id: `recruit-${String(id)}`,
            kind: "recruit" as const,
            label: hero.name,
          },
        ],
  ),
  {
    ...at(7, 0, -4_500),
    hero: bit,
    id: `recruit-${String(bit)}`,
    kind: "recruit",
    label: "Bit",
    on: days(4, 5),
  },
];
const stops: Spot[] = loop.map((borough, index) => ({
  ...at(borough, 0, 2_500),
  id: `stop-${String(borough)}`,
  kind: "stop",
  label: "Green Line Express",
  next: `stop-${String(loop[(index + 1) % loop.length] ?? 0)}`,
}));

// S's twenty-one letters, a few on each day's avenues: three on the first morning, then four, four, five and five.
const avenue: readonly (readonly [number, number, number])[] = [
  [3_000, 12_000, 1],
  [21_000, 24_000, 1],
  [12_000, 27_000, 1],
  [9_000, 12_000, 2],
  [27_000, 24_000, 2],
  [24_000, 9_000, 2],
  [12_000, 15_000, 2],
  [15_000, 12_000, 3],
  [33_000, 24_000, 3],
  [24_000, 21_000, 3],
  [12_000, 3_000, 3],
  [21_000, 12_000, 4],
  [3_000, 24_000, 4],
  [24_000, 27_000, 4],
  [12_000, 21_000, 4],
  [33_000, 12_000, 4],
  [27_000, 12_000, 5],
  [9_000, 24_000, 5],
  [24_000, 15_000, 5],
  [12_000, 33_000, 5],
  [24_000, 3_000, 5],
];
const letters: Spot[] = avenue.map(([x, z, day], index) => ({
  id: `letter-${String(index + 1)}`,
  kind: "letter",
  label: "A letter signed S",
  on: days(day),
  x,
  z,
}));

export const spots: readonly Spot[] = [
  ...homes,
  ...heroWords,
  ...recruits,
  ...stops,
  ...letters,
  ...sites,
];
const named = new Map(spots.map((spot) => [spot.id, spot]));
export const spotNamed = (id: string): Spot | undefined => named.get(id);

// Whether a place is there for this hero today (a hidden one only while frost vision is on).
export const openTo = (
  spot: Spot,
  day: Pick<DayState, "day" | "hero" | "looking">,
): boolean =>
  (spot.on === undefined || (spot.on & (1 << day.day)) !== 0) &&
  (spot.only === undefined || spot.only === day.hero) &&
  (spot.hidden !== true || day.looking);

// The open place within reach, the nearest if there are several.
export function nearest(
  day: Pick<DayState, "day" | "hero" | "looking" | "x" | "z">,
): Spot | null {
  let best: Spot | null = null;
  let gap = reach + 1;
  for (const spot of spots) {
    const away = Math.max(Math.abs(spot.x - day.x), Math.abs(spot.z - day.z));
    if (away < gap && openTo(spot, day)) {
      best = spot;
      gap = away;
    }
  }
  return best;
}

// Whether a place is within reach of where the hero stands.
export const inReach = (from: Point, place: Point): boolean =>
  Math.max(Math.abs(from.x - place.x), Math.abs(from.z - place.z)) <= reach;
