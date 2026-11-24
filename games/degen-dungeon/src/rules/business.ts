import { lineCool, ticksPerSecond } from "./constants.ts";
import { cooled } from "./heat.ts";
import { insideAt, lofts } from "./rooms.ts";
import type { Spot } from "./spot.ts";
import type { DayState, Draft, Point } from "./types.ts";
import { venture, venues } from "./venues.ts";
import { at, loop } from "./world.ts";

// Three things a hero does with their own hands or feet (`view/train.ts`, `view/rides.ts`):
// - Their business: every hero runs an online shop from the laptop in their loft, and it sells while they are out, a DUN a second on day
//   one and a DUN more a second each day after, up to a full till (`tillCap`). Emptying it at the laptop is how the rent stays easy.
// - The Green Line Express: at a stop the hero takes the lift up to the platform, rides the elevated train along to the next stop round
//   the loop, and takes the lift down there (`lineTicks` in all, the lifts `lineLift` each).
// - Skating: the skate park hands the hero a board; five seconds of skating round the park on it is the day's skate.
// The numbers are a draft for the owner.
export const tillCap = 3_000;
export const lineTicks = 150;
export const lineLift = 15;
export const skateTicks = 150;

// What the shop has sold since the till was last emptied.
export const tillOf = (
  day: Pick<DayState, "day" | "tick" | "tillAt">,
): number =>
  Math.min(
    tillCap,
    Math.floor(((day.tick - day.tillAt) * day.day) / ticksPerSecond),
  );
// The laptop on the desk across the loft from the bed, by the door (where the hero stands to use it).
export const tillSites: readonly Spot[] = lofts.map((loft, hero) => ({
  ...insideAt(loft, 990, 880),
  id: `till-${String(hero)}`,
  kind: "talk",
  label: "Your shop's laptop",
  node: "till",
  only: hero,
}));
function collect(day: Draft): string | null {
  const sold = tillOf(day);
  if (sold <= 0) return "nothing has sold yet: give it a minute";
  day.pocket += sold;
  day.made += sold;
  day.tillAt = day.tick;
  if (!day.done.includes("till")) day.done = [...day.done, "till"];
  return null;
}

// The Green Line's stops round the loop of boroughs (`places.ts` lists them as places).
export const stopAt = (borough: number): Point => at(borough, 0, 2_500);
export const nextStop = (borough: number): number => {
  const index = loop.findIndex((one) => one === borough);
  return loop[(index + 1) % loop.length] ?? 0;
};
export function boardLine(
  day: Draft,
  stop: Point & { readonly next: string },
): string | null {
  if (day.ride !== "foot") return "the train takes people, not rides";
  day.line = {
    at: day.tick,
    from: { x: stop.x, z: stop.z },
    to: Number(stop.next.replace("stop-", "")),
  };
  day.dir = -1;
  return null;
}
// How far along the rails a ride is, from 0 at the top of the first lift to 1 at the top of the last.
export const lineAlong = (line: DayState["line"], tick: number): number =>
  line === null
    ? 0
    : Math.max(
        0,
        Math.min(1, (tick - line.at - lineLift) / (lineTicks - 2 * lineLift)),
      );
// Each tick aboard: carried along toward the next stop, and stepping off there.
export function lineTick(day: Draft): void {
  const line = day.line;
  if (line === null) return;
  const to = stopAt(line.to);
  const part = lineAlong(line, day.tick);
  day.x = line.from.x + Math.round((to.x - line.from.x) * part);
  day.z = line.from.z + Math.round((to.z - line.from.z) * part);
  if (day.tick - line.at < lineTicks) return;
  day.line = null;
  day.rides += 1;
  cooled(day, lineCool);
}

// Whether a point is in the skate park.
const park = venues.find(({ kind }) => kind === "skate");
export const inPark = (x: number, z: number): boolean =>
  park !== undefined &&
  x >= park.lot.x0 &&
  x <= park.lot.x1 &&
  z >= park.lot.z0 &&
  z <= park.lot.z1;
function takeBoard(day: Draft): string | null {
  if (day.done.includes("did-skate")) return "you have skated today";
  if (day.ride === "board") return "you are on a board";
  if (day.ride !== "foot") return "leave the ride you are on first";
  day.ride = "board";
  day.rideId = "";
  return null;
}
// Each tick rolling on a board in the park counts; the fifth second of it is the day's skate (as the activity, `venues.ts`).
export function skateTick(day: Draft): void {
  if (
    day.ride !== "board" ||
    day.dir < 0 ||
    day.done.includes("did-skate") ||
    !inPark(day.x, day.z)
  )
    return;
  day.skated += 1;
  if (day.skated >= skateTicks) venture(day, "skate");
}

// The laptop's talk and the skate park's (which hands over a board instead of a run).
export const businessNodes = {
  "do-skate": [{ does: "biz-board" }, {}],
  till: [{ does: "biz-till", to: "till" }, {}],
} as const;
export const businessDeed = (day: Draft, name: string): string | null =>
  name === "biz-till"
    ? collect(day)
    : name === "biz-board"
      ? takeBoard(day)
      : null;
