import {
  beach,
  block,
  bodyRadius,
  island,
  lots,
  moon,
  sea,
  shore,
  tunnel,
} from "./constants.ts";
import { inRoom } from "./rooms.ts";
import { inVenue, lawns, outdoors } from "./venues.ts";
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
// Where wheels may be: on the island and not in a building, which takes in the plazas round the landmarks and the open lots. Feet may
// also be inside one of the shops or landmarks you can walk into.
export const onStreet = (x: number, z: number): boolean =>
  x >= bodyRadius &&
  z >= bodyRadius &&
  x <= island - bodyRadius &&
  z <= island - bodyRadius &&
  (!(inLot(x) && inLot(z)) || outdoors(x, z));
export const onLand = (x: number, z: number): boolean =>
  onStreet(x, z) || inRoom(x, z) || inVenue(x, z);
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
// A building's wall beside a point on the street, within a climber's reach: the way to it (a unit step east, south, west or north) and
// how far it is (centimetres, in steps of ten), the nearest if there are more. Null where there is none: away from the buildings, at the
// island's edge, and anywhere off the street (in a shop, a landmark, the tunnel or on the moon).
export const wallReach = 150;
export interface Wall {
  readonly east: number;
  readonly gap: number;
  readonly south: number;
}
const compass = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
] as const;
export function wallBeside(x: number, z: number): Wall | null {
  if (!onStreet(x, z)) return null;
  let found: Wall | null = null;
  for (const [east, south] of compass)
    for (let gap = 10; gap <= wallReach; gap += 10) {
      if (found !== null && gap >= found.gap) break;
      const across = x + east * gap;
      const along = z + south * gap;
      // The island's edge is the shore, not a wall.
      const edge = island - bodyRadius;
      if (
        Math.min(across, along) < bodyRadius ||
        Math.max(across, along) > edge
      )
        break;
      if (onLand(across, along)) continue;
      found = { east, gap, south };
      break;
    }
  return found;
}

// The roofs a climber can walk: the ring of low buildings round every built lot, `roofDepth` deep from the lot's edge, not the courtyard
// inside the ring, the tower in its middle, nor anything on an open lot or a landmark's.
export const roofDepth = 900;
const fromEdge = (value: number): number | null => {
  const local = value % block;
  const lot = lots.find(([near, far]) => local >= near && local <= far);
  return lot === undefined ? null : Math.min(local - lot[0], lot[1] - local);
};
export function onRoof(x: number, z: number): boolean {
  if (Math.min(x, z) < 0 || Math.max(x, z) > island) return false;
  const across = fromEdge(x);
  const along = fromEdge(z);
  if (across === null || along === null) return false;
  if (outdoors(x, z) || inVenue(x, z)) return false;
  return Math.min(across, along) <= roofDepth;
}

// The Old Floe's park (its middle and its lawns), where sitting still cools FOMO; the riot across The Exchange on the first morning.
export const inPark = (x: number, z: number): boolean =>
  (Math.abs(x - 30_000) <= 3_000 && Math.abs(z - 6_000) <= 3_000) ||
  lawns.some(
    (lawn) => x >= lawn.x0 && x <= lawn.x1 && z >= lawn.z0 && z <= lawn.z1,
  );
export const inRiot = (x: number, z: number): boolean =>
  Math.abs(x - 18_000) <= 4_000 && Math.abs(z - 18_000) <= 4_000;
// The oldest tunnel and SHA Beach, open only once the Genesis Room is.
export const inTunnel = (x: number, z: number): boolean =>
  x >= tunnel.x0 && x <= tunnel.x1 && z >= tunnel.z0 && z <= tunnel.z1;
export const onBeach = (x: number, z: number): boolean =>
  x >= beach.x0 && x <= beach.x1 && z >= beach.z0 && z <= beach.z1;
// On the moon's ground, round the colony.
export const onMoon = (x: number, z: number): boolean =>
  x >= moon.x0 + bodyRadius &&
  x <= moon.x1 - bodyRadius &&
  z >= moon.z0 + bodyRadius &&
  z <= moon.z1 - bodyRadius;
