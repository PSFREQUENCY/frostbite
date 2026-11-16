import { roll, saltOf } from "./coin.ts";
import { visionTicks } from "./constants.ts";
import { heated } from "./heat.ts";
import type { Draft } from "./types.ts";

// The windows up a building's wall: wherever the hero clings there is one in reach, one for every four metres along a wall at each
// storey. Climbing in is once a window a day, and who is in is the day's luck (its seed): a neighbour on the sill who shares a snack
// (frost vision back), an artist's loft where they let you sketch the view (respect), an empty flat to let with nothing but an echo, or
// somebody at home who shuts the window on you (a little heat). The visit is a short talk, and the hero is back out on the wall after it.
export type Inside = "empty" | "loft" | "shut" | "snack";
const insides: readonly Inside[] = ["snack", "loft", "empty", "shut"];
export const snackVision = 120;
export const loftRep = 6;
export const shutHeat = 40;
const span = 400;

export const windowOf = (day: Pick<Draft, "level" | "x" | "z">): string =>
  `window-${String(Math.floor(day.x / span))}-${String(Math.floor(day.z / span))}-${String(day.level)}`;
export const insideOf = (seed: number, id: string): Inside =>
  insides[roll(seed, saltOf(id), insides.length)] ?? "empty";

export function enterWindow(day: Draft): string | null {
  const id = windowOf(day);
  if (day.done.includes(id)) return "that window is shut now";
  const inside = insideOf(day.seed, id);
  if (inside === "snack")
    day.vision = Math.min(2 * visionTicks, day.vision + snackVision);
  if (inside === "loft") day.rep += loftRep;
  if (inside === "shut") heated(day, shutHeat);
  day.done = [...day.done, id];
  day.talk = `window-${inside}`;
  return null;
}
