import { flies, type DayState, type Draft } from "./types.ts";
import {
  letterAt,
  letterFoot,
  letterTop,
  onLetterTop,
  seatNear,
} from "./mountain.ts";
import { onRoof, onStreet, wallBeside } from "./world.ts";
import { inLift, rideLift } from "./haus.ts";

// Going up and down: a helicopter climbs and drops a level at a time (three at most, and it lands only on the street), and on foot the
// hero climbs a building's wall from the pavement beside it (`wallBeside`), a storey at a time, up to three, and from the top storey
// steps up onto the roof (`roofLevel`), where they can walk the ring of rooftops (`onRoof`) and, at its edge over a street, climb back
// down. The WAGMI letters on Mount WAGMI (`mountain.ts`) climb the same way from the terrace in front of them, at the seat nearest the
// climber, and from the top storey the hero sits on the letter's top (nobody walks along it) and climbs back down the face. On a wall nobody walks, gets on a ride or uses
// anything but the window in front of them (`windows.ts`); the beat cop, who only catches feet on the ground, waits underneath, but a tux
// at four stars still reaches.
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
  if (letterAt(day.x, day.z) >= 0) return letterTop(day.z);
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
    ? wallBeside(day.x, day.z) !== null || letterAt(day.x, day.z) >= 0
    : day.level < storeys || (day.level === storeys && roofStep(day) !== null));

export function lift(day: Draft, by: number): string | null {
  // In Haus De Savage's glass elevator, up or down a floor.
  if (inLift(day)) return rideLift(day, day.floor + by);
  if (day.ride === "foot") return climb(day, by);
  if (!flies(day.ride)) return "only a helicopter climbs";
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
  const letter = onLetterTop(day.x, day.z);
  const to =
    day.level === roofLevel
      ? letter
        ? letterFoot(day.z)
        : streetEdge(day.x, day.z)
      : level === roofLevel
        ? roofStep(day)
        : day.level === 0 && letterAt(day.x, day.z) >= 0
          ? { x: day.x, z: seatNear(day.z) }
          : day;
  if (to === null)
    return day.level === roofLevel
      ? "walk to the roof's edge first"
      : "no roof up there";
  if (
    day.level === 0 &&
    wallBeside(day.x, day.z) === null &&
    letterAt(day.x, day.z) < 0
  )
    return "nothing to climb here";
  day.x = to.x;
  day.z = to.z;
  day.level = level;
  day.dir = -1;
  // The first time up a wall today, the first roof and the first seat on a WAGMI letter are remembered (milestones and side quests
  // read them).
  const mark =
    level !== roofLevel ? "wall" : onLetterTop(day.x, day.z) ? "wagmi" : "roof";
  if (by > 0 && !day.done.includes(mark)) day.done = [...day.done, mark];
  return null;
}
