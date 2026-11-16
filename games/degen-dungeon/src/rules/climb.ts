import type { DayState, Draft } from "./types.ts";
import { onStreet, wallBeside } from "./world.ts";

// Going up and down: a helicopter climbs and drops a level at a time (three at most, and it lands only on the street), and on foot the
// hero climbs a building's wall from the pavement beside it (`wallBeside`), a storey at a time, up to three, and climbs back down the
// same way. Up a wall nobody walks, uses anything or gets on a ride; the beat cop, who only catches feet on the ground, waits underneath,
// but a tux at four stars still reaches.
export const storeys = 3;

// On foot and up a wall.
export const clinging = (day: Pick<DayState, "level" | "ride">): boolean =>
  day.ride === "foot" && day.level > 0;

// Whether the hero could climb a storey from where they are now.
export const canClimb = (
  day: Pick<DayState, "level" | "ride" | "talk" | "x" | "z">,
): boolean =>
  day.ride === "foot" &&
  day.talk === null &&
  (day.level > 0 ? day.level < storeys : wallBeside(day.x, day.z) !== null);

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
  if (level < 0 || level > storeys) return "no higher or lower than that";
  if (day.level === 0 && wallBeside(day.x, day.z) === null)
    return "nothing to climb here";
  day.level = level;
  day.dir = -1;
  return null;
}
