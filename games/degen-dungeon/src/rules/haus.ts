import { bodyRadius, reach } from "./constants.ts";
import type { Box } from "./rooms.ts";
import type { DayState, Draft, Point } from "./types.ts";

// Haus De Savage, the island's tree of sky apartments, on its own islet in the sea south of Gig Street with a bridge from the shore: a
// round plaza, the trunk in its middle with a lobby inside (its doorway faces the bridge), twenty-one floors above, and glass elevators
// running up the trunk's south face to every one of them. Floors 1 to 19 are a ring of glass round the trunk with a branch of garden
// held out on one side, turning a little further round on each floor; floor 20 is the sky penthouse, with a pad for a hover car; 21 is
// the rooftop, a crown of deck with a pool, a helicopter and a restaurant. The top two need the penthouse keycard. Everything here is in
// whole centimetres: distances are compared squared, and the branches point along eight literal directions. A draft for the owner.
export const haus: Point = { x: 30_000, z: 39_000 };
export const isletRadius = 1_800;
export const trunkRadius = 700;
export const lobbyRadius = 620;
export const topFloor = 21;
export const penthouseFloor = 20;
// The elevator takes this many ticks a floor, and its doors this many at each end.
export const floorTicks = 8;
export const doorTicks = 15;
// The bridge from the end of Gig Street's middle street, and the lobby's doorway through the trunk's north wall.
export const bridge: Box = { x0: 29_600, x1: 30_400, z0: 35_900, z1: 37_400 };
const doorway: Box = {
  x0: haus.x - 120,
  x1: haus.x + 120,
  z0: haus.z - trunkRadius - 80,
  z1: haus.z - lobbyRadius + 60,
};
// Where the hero stands in the glass elevator, against the trunk's south wall, on every floor.
export const liftAt: Point = { x: haus.x, z: haus.z + 560 };

const within = (box: Box, x: number, z: number): boolean =>
  x >= box.x0 && x <= box.x1 && z >= box.z0 && z <= box.z1;
const apart = (x: number, z: number, from: Point = haus): number =>
  (x - from.x) * (x - from.x) + (z - from.z) * (z - from.z);
// The islet's ground under wheels and feet: the bridge and the plaza round the trunk (not the trunk itself).
export const onIslet = (x: number, z: number): boolean =>
  within(bridge, x, z) ||
  (apart(x, z) <= (isletRadius - bodyRadius) ** 2 &&
    apart(x, z) >= (trunkRadius + bodyRadius) ** 2);
// All of the islet, trunk and all, which boats keep off.
export const isletLand = (x: number, z: number): boolean =>
  within(bridge, x, z) || apart(x, z) <= isletRadius * isletRadius;
// The lobby inside the trunk, and its doorway, for feet only.
export const inLobby = (x: number, z: number): boolean =>
  apart(x, z) <= (lobbyRadius - bodyRadius) ** 2 || within(doorway, x, z);

// Eight directions as literal steps of 1,024, east first and round through north; the branches use all but south, where the elevators run.
const branches: readonly (readonly [number, number])[] = [
  [1_024, 0],
  [724, -724],
  [0, -1_024],
  [-724, -724],
  [-1_024, 0],
  [-724, 724],
  [724, 724],
];
const plate = 1_100;
const branchReach = 1_500;
const branchRadius = 450;
const penthousePlate = 1_300;
const crown = 1_700;
// The middle of a floor's branch of garden, and of the penthouse's hover pad (held out west).
export const branchOf = (floor: number): Point => {
  const [east, south] = branches[(floor * 3) % branches.length] ?? [1_024, 0];
  return {
    x: haus.x + Math.trunc((east * branchReach) / 1_024),
    z: haus.z + Math.trunc((south * branchReach) / 1_024),
  };
};
export const hoverPad: Point = { x: haus.x - 1_700, z: haus.z };
const padRadius = 600;

// Where feet may be on a floor above the lobby.
export function onFloor(floor: number, x: number, z: number): boolean {
  const room = (radius: number, from: Point = haus): boolean =>
    apart(x, z, from) <= (radius - bodyRadius) ** 2;
  if (floor === topFloor) return room(crown);
  if (floor === penthouseFloor)
    return room(penthousePlate) || room(padRadius, hoverPad);
  return floor > 0 && floor < penthouseFloor
    ? room(plate) || room(branchRadius, branchOf(floor))
    : false;
}

// Standing in the glass elevator: on foot, inside Haus De Savage, within reach of its car.
export const inLift = (
  day: Pick<DayState, "floor" | "ride" | "x" | "z">,
): boolean =>
  day.ride === "foot" &&
  (day.floor > 0 || inLobby(day.x, day.z)) &&
  Math.max(Math.abs(day.x - liftAt.x), Math.abs(day.z - liftAt.z)) <= reach;

// A ride in the glass elevator to another floor: the top two only with the keycard.
export function rideLift(day: Draft, to: number): string | null {
  if (day.elevator !== null) return "the elevator is moving";
  if (to < 0 || to > topFloor) return "no higher or lower than that";
  if (to === day.floor) return "you are on that floor";
  if (to >= penthouseFloor && !day.keycard)
    return "the top floors need a penthouse keycard";
  day.elevator = { at: day.tick, from: day.floor, to };
  day.x = liftAt.x;
  day.z = liftAt.z;
  day.dir = -1;
  return null;
}
// How long a ride between two floors takes (ticks), and how far up the car is partway (floors, in tenths), for the screen.
export const liftTicks = (from: number, to: number): number =>
  2 * doorTicks + Math.abs(to - from) * floorTicks;
export const liftTenths = (
  ride: NonNullable<DayState["elevator"]>,
  tick: number,
): number => {
  const moving = Math.max(
    0,
    Math.min(
      Math.abs(ride.to - ride.from) * floorTicks,
      tick - ride.at - doorTicks,
    ),
  );
  const step = ride.to > ride.from ? 1 : -1;
  return ride.from * 10 + Math.trunc((step * moving * 10) / floorTicks);
};
// Each tick of a ride: at its end the doors open on the new floor.
export function elevatorTick(day: Draft): void {
  const ride = day.elevator;
  if (ride === null) return;
  if (day.tick - ride.at < liftTicks(ride.from, ride.to)) return;
  day.floor = ride.to;
  day.elevator = null;
}
