import {
  beach,
  block,
  bodyRadius,
  island,
  lots,
  sea,
  shore,
  tunnel,
} from "./constants.ts";
import type { Point } from "./types.ts";

// The island: nine boroughs in a grid, a street through the middle of each both ways, avenues between them, buildings in the corners,
// and the named zones the rules read. The places where something can be done are in `places.ts`.
export const boroughs = [
  "Cold Harbor",
  "Whale Marina",
  "The Old Floe",
  "Neon Row",
  "The Exchange",
  "Meme Market",
  "Rug Row",
  "The Shaft",
  "Gig Street",
] as const;

export const centreOf = (borough: number): Point => ({
  x: block / 2 + block * (borough % 3),
  z: block / 2 + block * Math.floor(borough / 3),
});
export const at = (borough: number, east: number, south: number): Point => {
  const centre = centreOf(borough);
  return { x: centre.x + east, z: centre.z + south };
};

// The Green Line Express loops the eight outer boroughs, clockwise from Cold Harbor.
export const loop = [0, 1, 2, 5, 8, 7, 6, 3] as const;
// Where a boat floats beside the dock and where its rider steps ashore, and where the helicopter stands.
export const dockWater: Point = { x: 18_000, z: -400 };
export const dockLand: Point = { x: 18_000, z: 100 };
export const helipad: Point = at(4, 3_000, 0);

const inLot = (value: number): boolean => {
  const local = value % block;
  return lots.some(
    ([near, far]) => local > near - bodyRadius && local < far + bodyRadius,
  );
};
// Where feet and wheels may be: on the island and not in a building.
export const onLand = (x: number, z: number): boolean =>
  x >= bodyRadius &&
  z >= bodyRadius &&
  x <= island - bodyRadius &&
  z <= island - bodyRadius &&
  !(inLot(x) && inLot(z));
// Where a helicopter may be, and a boat (which also keeps off the shore).
export const inSky = (x: number, z: number): boolean =>
  x >= -sea && z >= -sea && x <= island + sea && z <= island + sea;
export const onWater = (x: number, z: number): boolean =>
  inSky(x, z) &&
  (x < -shore || z < -shore || x > island + shore || z > island + shore);
// The Swap Meet's lot in Meme Market, where the airdrop falls thickest.
export const inSwapMeet = (x: number, z: number): boolean =>
  x >= 31_000 && x <= 35_000 && z >= 17_000 && z <= 19_000;

// The four story places of a borough, one in each lane of its two streets: a little off the middle line, so they never crowd a spot on it.
export const slotOf = (borough: number, lane: number): Point =>
  [
    at(borough, 700, -4_000),
    at(borough, -700, 4_000),
    at(borough, -4_000, -700),
    at(borough, 4_000, 700),
  ][lane] ?? centreOf(borough);
// The Old Floe's park, where sitting still cools FOMO; the riot across The Exchange on the first morning.
export const inPark = (x: number, z: number): boolean =>
  Math.abs(x - 30_000) <= 3_000 && Math.abs(z - 6_000) <= 3_000;
export const inRiot = (x: number, z: number): boolean =>
  Math.abs(x - 18_000) <= 4_000 && Math.abs(z - 18_000) <= 4_000;
// The oldest tunnel and SHA Beach, open only once the Genesis Room is.
export const inTunnel = (x: number, z: number): boolean =>
  x >= tunnel.x0 && x <= tunnel.x1 && z >= tunnel.z0 && z <= tunnel.z1;
export const onBeach = (x: number, z: number): boolean =>
  x >= beach.x0 && x <= beach.x1 && z >= beach.z0 && z <= beach.z1;
