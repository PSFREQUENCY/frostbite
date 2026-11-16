import type { DayState, Draft } from "./types.ts";
import { onRoof, onStreet, wallBeside } from "./world.ts";

// Going up and down: a helicopter climbs and drops a level at a time (three at most, and it lands only on the street), and on foot the
// hero climbs a building's wall from the pavement beside it (`wallBeside`), a storey at a time, up to three, and from the top storey
// steps up onto the roof (`roofLevel`), where they can walk the ring of rooftops (`onRoof`) and, at its edge over a street, climb back
// down. On a wall nobody walks, gets on a ride or uses anything but the window in front of them (`windows.ts`); the beat cop, who only
// catches feet on the ground, waits underneath, but a tux at four stars still reaches.
export const storeys = 3;
export const roofLevel = storeys + 1;
const stepOn = 120;
const outFrom = 70;

// On foot and up a wall (not on the roof).
export const clinging = (day: Pick<DayState, "level" | "ride">): boolean =>
  day.ride === "foot" && day.level > 0 && day.level <= storeys;
export const onTheRoof = (day: Pick<DayState, "level" | "ride">): boolean =>
  day.ride === "foot" && day.level === roofLevel;

// The roof just over the wall a climber clings to, or null.
export function roofStep(
  day: Pick<DayState, "x" | "z">,
): { readonly x: number; readonly z: number } | null {
  const wall = wallBeside(day.x, day.z);
  if (wall === null) return null;
  const x = day.x + wall.east * (wall.gap + stepOn);
  const z = day.z + wall.south * (wall.gap + stepOn);
  return onRoof(x, z) ? { x, z } : null;
}

// The pavement under a roof's edge, a step out from the wall, or null away from the edges (or over a courtyard).
export function streetEdge(
  x: number,
  z: number,
): { readonly x: number; readonly z: number } | null {
  for (const [east, south] of [
    [1, 0],
    [0, 1],
    [-1, 0],
    [0, -1],
  ] as const)
    for (let gap = 10; gap <= 150; gap += 10) {
      if (!onStreet(x + east * gap, z + south * gap)) continue;
      return { x: x + east * (gap + outFrom), z: z + south * (gap + outFrom) };
    }
  return null;
}

// Whether the hero could climb a storey (or onto the roof) from where they are now.
export const canClimb = (
  day: Pick<DayState, "level" | "ride" | "talk" | "x" | "z">,
): boolean =>
  day.ride === "foot" &&
  day.talk === null &&
  (day.level === 0
    ? wallBeside(day.x, day.z) !== null
    : day.level < storeys || (day.level === storeys && roofStep(day) !== null));

export function lift(day: Draft, by: number): string | null {
  if (day.ride === "foot") return climb(day, by);
  if (day.ride !== "heli") return "only a helicopter climbs";
  const level = day.level + by;
  if (level < 0 || level > storeys) return "no higher or lower than that";
  if (level === 0 && !onStreet(day.x, day.z)) return "nowhere to land here";
  day.level = level;
  return null;
}

function climb(day: Draft, by: number): string | null {
  if (day.talk !== null) return "answer first";
  const level = day.level + by;
  if (level < 0 || level > roofLevel) return "no higher or lower than that";
  const to =
    day.level === roofLevel
      ? streetEdge(day.x, day.z)
      : level === roofLevel
        ? roofStep(day)
        : day;
  if (to === null)
    return day.level === roofLevel
      ? "walk to the roof's edge first"
      : "no roof up there";
  if (day.level === 0 && wallBeside(day.x, day.z) === null)
    return "nothing to climb here";
  day.x = to.x;
  day.z = to.z;
  day.level = level;
  day.dir = -1;
  return null;
}
