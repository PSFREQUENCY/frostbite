import type { DayState, Draft, Point } from "./types.ts";

// The nine statues, one on the middle street of each borough: masked runners caught mid-stride, each in a mask of its own. Acting at one
// puts its mask on: the hero plays the day on as that statue, a stride quicker on foot, until another mask goes on or the same statue
// takes its own back. The Old Floe's is the Ice Runner, which wakes as the Time Machine when the hero reaches the top.
export const statues: readonly (Point & { readonly label: string })[] = [
  { label: "The Harbor Sprinter", x: 2_800, z: 6_000 },
  { label: "The Tide Leaper", x: 14_800, z: 6_000 },
  { label: "The Ice Runner", x: 32_500, z: 6_000 },
  { label: "The Neon Ghost", x: 2_800, z: 18_000 },
  { label: "The Golden Bull", x: 20_300, z: 18_000 },
  { label: "The Grinner", x: 27_500, z: 17_300 },
  { label: "The Weaver", x: 2_800, z: 30_000 },
  { label: "The Digger", x: 14_800, z: 30_000 },
  { label: "The Sunburst", x: 26_800, z: 30_000 },
];
// How much quicker a masked hero is on foot, in tenths of their pace.
export const strideTenths = 3;

export const statueId = (index: number): string => `statue-${String(index)}`;
// How many of the masks the hero has worn today.
export const masksWorn = (day: Pick<DayState, "done">): number =>
  day.done.filter((id) => id.startsWith("statue-")).length;

// Puts a statue's mask on (or, at the statue whose mask the hero wears, takes it off). Feet only.
export function wear(day: Draft, index: number): string | null {
  if (day.ride !== "foot") return "leave the ride you are on first";
  if (day.form === index) {
    day.form = -1;
    return null;
  }
  day.form = index;
  const id = statueId(index);
  if (!day.done.includes(id)) day.done = [...day.done, id];
  return null;
}
