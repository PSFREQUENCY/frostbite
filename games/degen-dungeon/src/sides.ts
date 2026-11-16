import { openTo, spots } from "./rules/places.ts";
import { bit } from "./rules/spot.ts";
import type { DayState } from "./rules/types.ts";
import { lettersSide, sideLabels } from "./script/sides.ts";

// The side quests: six a day beside the story's three, none of them needed for anything. Every day has S's three letters on its
// avenues; then a landmark and a shop of the day, and three that belong to the day (`script/sides.ts` has the words, in this order).
// Each is read from the day as it stands, so this decides nothing: it is what the backpack lists and the page cheers.
export interface Side {
  // How far along a counted one is, as done and needed.
  readonly count?: readonly [number, number];
  readonly done: boolean;
  readonly label: string;
}
type Check = (day: DayState) => boolean | readonly [number, number];

const has =
  (...names: readonly string[]): Check =>
  (day) =>
    names.some((name) => day.done.includes(name));
const begins =
  (prefix: string): Check =>
  (day) =>
    day.done.some((id) => id.startsWith(prefix));
const counted =
  (of: (day: DayState) => number, needed: number): Check =>
  (day) => [Math.min(of(day), needed), needed];
const ridesTaken = (day: DayState): number =>
  new Set(
    day.done.flatMap((id) => {
      const kind = /^(bike|car|moto|scooter|truck|van)-\d+$/u.exec(id)?.[1];
      return kind === undefined ? [] : [kind];
    }),
  ).size;

const checks: readonly (readonly Check[])[] = [
  [
    has("riot"),
    has("did-read"),
    has("item-pizza"),
    begins("heroword-"),
    has("wall"),
  ],
  [
    has("did-live"),
    begins("game-"),
    counted((day) => day.gigs, 3),
    counted((day) => day.rides, 8),
    counted((day) => day.words, 3),
  ],
  [
    has("did-dance"),
    has("item-glow"),
    has("contact"),
    (day) => day.maxx > 0,
    (day) => day.spotted > 0,
  ],
  [
    has("did-skate"),
    begins("washer-"),
    has("stash"),
    (day) => day.storm > 0,
    begins("window-"),
  ],
  [
    has("did-vr"),
    has("fit-gloves", "fit-shades", "fit-parka"),
    has("home-studio", "home-rowhouse", "home-yard"),
    has(`recruit-${String(bit)}`),
    (day) => day.warned > 0,
  ],
  [has("did-film"), has("staked"), has("roof"), has("did-track"), has("paint")],
  [
    has("did-exhibits"),
    begins("semi-"),
    (day) => day.grass,
    counted(ridesTaken, 5),
    has("did-print"),
  ],
];

// S's letters lying on today's avenues, and how many of them are picked up.
const lettersFound = (day: DayState): readonly [number, number] => {
  const today = spots.filter(
    (spot) => spot.kind === "letter" && openTo(spot, day),
  );
  return [
    today.filter((spot) => day.done.includes(spot.id)).length,
    today.length,
  ];
};

const sideOf = (label: string, check: Check, day: DayState): Side => {
  const result = check(day);
  if (typeof result === "boolean") return { done: result, label };
  return { count: result, done: result[0] >= result[1], label };
};

// Today's side quests; none on a trip back to day one.
export function sidesOf(day: DayState): readonly Side[] {
  if (day.loop > 0) return [];
  const labels = sideLabels[day.day - 1] ?? [];
  return [
    sideOf(lettersSide, lettersFound, day),
    ...(checks[day.day - 1] ?? []).map((check, index) =>
      sideOf(labels[index] ?? "", check, day),
    ),
  ];
}
