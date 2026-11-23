import { crowdAt, crowdSize, gatheringAt } from "./crowd.ts";
import { heated } from "./heat.ts";
import { units } from "./move.ts";
import { openTo, spots } from "./places.ts";
import type { Spot } from "./spot.ts";
import type { DayState, Draft, Frost, Point } from "./types.ts";

// The freeze ray, kept in Cold Harbor Deli's freezer: only a hero wearing a statue's mask (`statues.ts`) can open the frost round it, and
// only a masked hero can fire it. A shot (`shoot`) runs `rayReach` along the way the hero last moved, `rayWidth` either side, and freezes
// everything it passes through, nearest first: the people of a crowd (`crowd.ts`), parked rides and rides left in the street, the people
// at the city's places (not the clerks behind a corner store's or a gas station's bulletproof glass), the beat cop and the tux. Each thaws
// `thawTicks` after it froze; no more than `mostFrozen` are frozen at once, and a pause of `rayCooldown` comes between shots. Freezing is
// noticed: heat for every person, ride and (most of all) chaser. A frozen ride cannot be taken, a frozen person cannot be talked to, and
// a frozen chaser stands still. `subZero` frozen at once is a milestone. Nobody is harmed: the ice melts and they carry on.
export const rayReach = 1_200;
export const rayWidth = 100;
export const thawTicks = 900;
export const mostFrozen = 63;
export const subZero = 36;
export const rayCooldown = 15;
export type Struck = "car" | "chaser" | "person";
const heatFor: Readonly<Record<Struck, number>> = {
  car: 4,
  chaser: 30,
  person: 3,
};

export interface Target extends Point {
  readonly id: string;
  readonly struck: Struck;
}

export const isFrozen = (day: Pick<DayState, "frozen">, id: string): boolean =>
  day.frozen.some((frost) => frost.id === id);

// Who stands at a place: not the freezers, ATMs and kiosk, not Miss Mirinda (the Dash runs on), and not a clerk behind bulletproof glass.
const behindGlass = new Set(["shop-bodega", "shop-gas"]);
const machines = new Set([
  "atm",
  "dash",
  "freezer",
  "freezer-ray",
  "id",
  "quiz",
]);
const personAt = (spot: Spot): boolean =>
  (spot.kind === "offer" ||
    spot.kind === "recruit" ||
    (spot.kind === "talk" &&
      !behindGlass.has(spot.node) &&
      !machines.has(spot.node))) &&
  spot.x <= 60_000;

// Everything the ray can catch today, where it stands now.
export function targetsOf(day: DayState): readonly Target[] {
  const gathering = gatheringAt(day);
  const crowd =
    gathering === null
      ? []
      : Array.from({ length: crowdSize }, (_, index): Target => ({
          ...crowdAt(gathering, index),
          id: `crowd-${String(index)}`,
          struck: "person",
        }));
  const kerbs = spots
    .filter(
      (spot) =>
        spot.kind === "parked" &&
        !day.done.includes(spot.id) &&
        spot.id !== day.rideId,
    )
    .map((spot): Target => ({
      id: spot.id,
      struck: "car",
      x: spot.x,
      z: spot.z,
    }));
  const left = day.left
    .filter((ride) => ride.id !== day.rideId)
    .map((ride): Target => ({
      id: ride.id,
      struck: "car",
      x: ride.x,
      z: ride.z,
    }));
  const people = spots
    .filter((spot) => personAt(spot) && openTo(spot, day))
    .map((spot): Target => ({
      id: `person-${spot.id}`,
      struck: "person",
      x: spot.x,
      z: spot.z,
    }));
  const chasers = [
    ...(day.cop === null
      ? []
      : [{ ...day.cop, id: "cop", struck: "chaser" as const }]),
    ...(day.tux === null
      ? []
      : [{ ...day.tux, id: "tux", struck: "chaser" as const }]),
  ];
  return [...crowd, ...kerbs, ...left, ...people, ...chasers];
}

// How far along the shot a target is (cm), or -1 when the shot misses it.
export function alongRay(
  day: Pick<DayState, "facing" | "x" | "z">,
  at: Point,
): number {
  const [east, south] = units[day.facing] ?? [0, 1_024];
  const dx = at.x - day.x;
  const dz = at.z - day.z;
  const along = Math.trunc((dx * east + dz * south) / 1_024);
  const aside = Math.abs(Math.trunc((dx * south - dz * east) / 1_024));
  return along > 0 && along <= rayReach && aside <= rayWidth ? along : -1;
}

// The gun taken from the frost (by the freezer's talk), and a shot.
export function takeRay(day: Draft): string | null {
  if (day.form < 0) return "the frost only opens for a statue's face";
  if (day.gun) return "the freeze ray is already in your hands";
  day.gun = true;
  return null;
}
export function shoot(day: Draft): string | null {
  if (!day.gun) return "nothing to shoot with";
  if (day.form < 0) return "the freeze ray answers only to a statue's face";
  if (day.talk !== null) return "answer first";
  if (day.ride !== "foot")
    return "the freeze ray needs both hands: get off the ride";
  if (day.tick - day.rayAt < rayCooldown)
    return "the freeze ray is still cold-charging";
  if (day.frozen.length >= mostFrozen)
    return "the tank is spent until something thaws";
  day.rayAt = day.tick;
  const caught = targetsOf(day)
    .map((target) => ({ along: alongRay(day, target), target }))
    .filter(({ along, target }) => along >= 0 && !isFrozen(day, target.id))
    .sort(
      (one, other) =>
        one.along - other.along || (one.target.id < other.target.id ? -1 : 1),
    )
    .slice(0, mostFrozen - day.frozen.length)
    .map(({ target }) => target);
  const until = day.tick + thawTicks;
  day.frozen = [
    ...day.frozen,
    ...caught.map(({ id }): Frost => ({ id, until })),
  ];
  day.peakFrozen = Math.max(day.peakFrozen, day.frozen.length);
  const heat = caught.reduce((sum, { struck }) => sum + heatFor[struck], 0);
  if (heat > 0) heated(day, heat);
  return null;
}

// Each tick: whatever has had its half a minute thaws.
export function thawed(day: Draft): void {
  if (day.frozen.some(({ until }) => until <= day.tick))
    day.frozen = day.frozen.filter(({ until }) => until > day.tick);
}
