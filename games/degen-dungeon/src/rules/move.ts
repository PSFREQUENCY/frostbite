import { underground } from "./caves.ts";
import { clinging, onTheRoof } from "./climb.ts";
import {
  boostPace,
  fizzTenths,
  fogLine,
  gaitTenths,
  tankPace,
} from "./constants.ts";
import { heroes } from "./heroes.ts";
import { strideTenths } from "./statues.ts";
import {
  flies,
  motors,
  type DayState,
  type Draft,
  type Ride,
} from "./types.ts";
import {
  dockWater,
  helipad,
  inSky,
  inTunnel,
  onBeach,
  onLand,
  onMoon,
  onRoof,
  onStreet,
  onWater,
  saucerPad,
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
  moto: 30,
  saucer: 54,
  scooter: 22,
  semi: 20,
  truck: 24,
  van: 26,
};
// On foot the gait changes the pace (running, crouching, crawling), and a statue's mask and a Fuzzy's fizz lengthen the stride; a tuned
// car is quicker, and a full tank makes anything with an engine a little quicker (`stores.ts`).
export const paceOf = (
  state: Pick<
    DayState,
    "boostUntil" | "done" | "fizz" | "form" | "gait" | "hero" | "ride" | "tick"
  >,
): number =>
  state.ride === "foot"
    ? Math.max(
        1,
        Math.floor(
          ((ridePace.foot + (heroes[state.hero]?.speed ?? 1)) *
            ((gaitTenths[state.gait] ?? 10) +
              (state.form >= 0 ? strideTenths : 0) +
              (state.fizz > 0 ? fizzTenths : 0))) /
            10,
        ),
      ) + (state.tick < state.boostUntil ? boostPace : 0)
    : ridePace[state.ride] +
      (state.ride === "car" && state.done.includes("tune") ? 8 : 0) +
      (motors.some((ride) => ride === state.ride) && state.done.includes("tank")
        ? tankPace
        : 0);
// Where a body may be: the moon's ground once the shuttle sets down, a boat on the water, a helicopter in the sky, wheels on the streets,
// and feet on the island and in the shops (and in the oldest tunnel and on SHA Beach once the Genesis Room is open).
function free(day: Draft): (x: number, z: number) => boolean {
  if (onMoon(day.x, day.z)) return onMoon;
  if (underground(day.x, day.z)) return underground;
  if (onTheRoof(day)) return onRoof;
  if (day.ride === "boat") return onWater;
  if (flies(day.ride)) return inSky;
  if (day.ride !== "foot") return onStreet;
  if (day.gate === 0) return onLand;
  return (x, z) => onLand(x, z) || inTunnel(x, z) || onBeach(x, z);
}

// One tick of travel on the heading held. Each axis moves on its own, so a body slides along a wall instead of sticking to it. Nobody
// moves while an offer waits for an answer or while up a wall, and a helicopter on the ground stays there. A boat or a helicopter that crosses the fog line
// toward SHA Beach is back where it set out from.
export function moved(day: Draft): void {
  const unit = units[day.dir];
  if (unit === undefined || day.talk !== null) return;
  if (flies(day.ride) ? day.level === 0 : clinging(day)) return;
  const pace = paceOf(day);
  const open = free(day);
  const x = day.x + Math.trunc((unit[0] * pace) / 1_024);
  if (open(x, day.z)) day.x = x;
  const z = day.z + Math.trunc((unit[1] * pace) / 1_024);
  if (open(day.x, z)) day.z = z;
  if (day.z >= fogLine || day.ride === "foot") return;
  const back =
    day.ride === "heli"
      ? helipad
      : day.ride === "saucer"
        ? saucerPad
        : dockWater;
  day.x = back.x;
  day.z = back.z;
  day.level = 0;
  day.dir = -1;
}
