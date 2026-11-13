import { fogLine, gaitTenths } from "./constants.ts";
import { heroes } from "./heroes.ts";
import type { DayState, Draft, Ride } from "./types.ts";
import {
  dockWater,
  helipad,
  inSky,
  inTunnel,
  onBeach,
  onLand,
  onMoon,
  onStreet,
  onWater,
} from "./world.ts";

// The sixteen headings as whole-number steps (a unit is 1,024), so the rules never take a sine: 0 is east, 4 south, 8 west, 12 north.
export const units = [
  [1_024, 0],
  [946, 392],
  [724, 724],
  [392, 946],
  [0, 1_024],
  [-392, 946],
  [-724, 724],
  [-946, 392],
  [-1_024, 0],
  [-946, -392],
  [-724, -724],
  [-392, -946],
  [0, -1_024],
  [392, -946],
  [724, -724],
  [946, -392],
] as const;

// Centimetres a tick: on foot it is the hero's own speed, on a ride the ride's.
const ridePace: Readonly<Record<Ride, number>> = {
  bike: 18,
  boat: 28,
  car: 32,
  foot: 10,
  heli: 36,
  scooter: 22,
};
// On foot the gait changes the pace (running, crouching, crawling); a tuned car is quicker.
export const paceOf = (
  state: Pick<DayState, "done" | "gait" | "hero" | "ride">,
): number =>
  state.ride === "foot"
    ? Math.max(
        1,
        Math.floor(
          ((ridePace.foot + (heroes[state.hero]?.speed ?? 1)) *
            (gaitTenths[state.gait] ?? 10)) /
            10,
        ),
      )
    : ridePace[state.ride] +
      (state.ride === "car" && state.done.includes("tune") ? 8 : 0);
// Where a body may be: the moon's ground once the shuttle sets down, a boat on the water, a helicopter in the sky, wheels on the streets,
// and feet on the island and in the shops (and in the oldest tunnel and on SHA Beach once the Genesis Room is open).
function free(day: Draft): (x: number, z: number) => boolean {
  if (onMoon(day.x, day.z)) return onMoon;
  if (day.ride === "boat") return onWater;
  if (day.ride === "heli") return inSky;
  if (day.ride !== "foot") return onStreet;
  if (day.gate === 0) return onLand;
  return (x, z) => onLand(x, z) || inTunnel(x, z) || onBeach(x, z);
}

// One tick of travel on the heading held. Each axis moves on its own, so a body slides along a wall instead of sticking to it. Nobody
// moves while an offer waits for an answer, and a helicopter on the ground stays there. A boat or a helicopter that crosses the fog line
// toward SHA Beach is back where it set out from.
export function moved(day: Draft): void {
  const unit = units[day.dir];
  if (unit === undefined || day.talk !== null) return;
  if (day.ride === "heli" && day.level === 0) return;
  const pace = paceOf(day);
  const open = free(day);
  const x = day.x + Math.trunc((unit[0] * pace) / 1_024);
  if (open(x, day.z)) day.x = x;
  const z = day.z + Math.trunc((unit[1] * pace) / 1_024);
  if (open(day.x, z)) day.z = z;
  if (day.z >= fogLine || day.ride === "foot") return;
  const back = day.ride === "heli" ? helipad : dockWater;
  day.x = back.x;
  day.z = back.z;
  day.level = 0;
  day.dir = -1;
}
