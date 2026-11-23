import { underground } from "./caves.ts";
import { ticksPerSecond } from "./constants.ts";
import { inRoom } from "./rooms.ts";
import type { DayState, Draft } from "./types.ts";
import { inVenue } from "./venues.ts";
import { inSky, onMoon, onStreet, onWater } from "./world.ts";

// The dragon's flight (`powers.ts` starts it): ten seconds in the air for each level of the power, quicker than running. At level one it
// flies low, over the streets, the open lots and the sea but not over the buildings; from level two it flies high over everything. Its
// power again lands it at once, and so does the end of the flight; landing over a building or the sea sets it down on the nearest open
// ground. Up there nobody on the ground can reach it, and it cannot use anything until it lands. The view lifts it (`view/lift.ts`).
// The numbers are a draft for the owner.
export const flightTicks = 10 * ticksPerSecond;

// The power's level: one to start, and one more for each top skill mastered today, up to three (`mastery.ts`).
export const powerLevel = (day: Pick<DayState, "done">): number =>
  1 + Math.min(2, day.done.filter((id) => id.startsWith("mastered-")).length);
export const flying = (day: Pick<DayState, "flyUntil" | "tick">): boolean =>
  day.tick < day.flyUntil;
export const flightPace = (day: Pick<DayState, "done">): number =>
  20 + 6 * powerLevel(day);
// Where a flight may go.
export const skyOf = (
  day: Pick<DayState, "done">,
): ((x: number, z: number) => boolean) =>
  powerLevel(day) >= 2 ? inSky : (x, z) => onStreet(x, z) || onWater(x, z);

// Off the ground from where the hero stands, for as long as the level allows; not under a roof.
export function takeOff(day: Draft): string | null {
  if (
    inRoom(day.x, day.z) ||
    inVenue(day.x, day.z) ||
    underground(day.x, day.z) ||
    onMoon(day.x, day.z)
  )
    return "no room to fly in here";
  day.flyUntil = day.tick + flightTicks * powerLevel(day);
  return null;
}

// Down on the nearest open ground: where the hero is, if it is open, or the first open place found going round them, a metre further
// out each time.
const rays: readonly (readonly [number, number])[] = [
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
  [0, -1],
  [1, -1],
];
export function land(day: Draft): void {
  day.flyUntil = Math.min(day.flyUntil, day.tick);
  if (onStreet(day.x, day.z)) return;
  for (let reach = 100; reach <= 12_000; reach += 100)
    for (const [east, south] of rays) {
      const x = day.x + east * reach;
      const z = day.z + south * reach;
      if (onStreet(x, z)) {
        day.x = x;
        day.z = z;
        return;
      }
    }
}

// Each tick: the flight that has just run out comes down.
export function flightTick(day: Draft): void {
  if (day.flyUntil > 0 && day.tick === day.flyUntil) land(day);
}
