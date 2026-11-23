import { block } from "./constants.ts";
import { heroes } from "./heroes.ts";
import type { Point } from "./types.ts";

// The mom-and-pop shops you can walk into: a room cut into a lot beside the street, with a doorway through its front wall and a counter at
// the back. Each borough has one or two on its middle street, and the outer rooms stand on the far side of their lots, facing the streets
// between boroughs (or the shore): the corner stores and the Silky stations. Feet may be in a room or its doorway as well as on the
// street (`world.ts`); the walls are the lot itself. The kind of shop decides what its counter sells (`talk.ts`, `stores.ts`).
export interface Box {
  readonly x0: number;
  readonly x1: number;
  readonly z0: number;
  readonly z1: number;
}
export interface Room {
  readonly borough: number;
  readonly corner: number;
  readonly counter: Point;
  readonly door: Box;
  readonly id: string;
  readonly kind: string;
  readonly label: string;
  // Whether the doorway is in the room's north wall (the room is south of its street).
  readonly north: boolean;
  // Whether it stands on the lot's outer side rather than on the middle street.
  readonly outer: boolean;
  readonly room: Box;
}

// Borough, which corner lot (0 north-west, 1 north-east, 2 south-west, 3 south-east), kind, and the name over the door.
type Shop = readonly [number, number, string, string];
const shops: readonly Shop[] = [
  [0, 0, "bait", "Dip's Bait and Tackle"],
  [0, 3, "pawn", "Harbor Pawn"],
  [1, 0, "noodles", "Marina Noodle Bar"],
  [1, 3, "laundry", "Suds Laundromat"],
  [2, 3, "coffee", "Floe Cocoa"],
  [3, 0, "arcade", "Neon Arcade"],
  [3, 3, "barber", "Fade Lab Barbers"],
  [4, 0, "coffee", "GM Coffee"],
  [4, 3, "bodega", "Ticker Bodega"],
  [5, 0, "pizza", "Two Pizzas"],
  [5, 3, "gym", "Up Day Gym"],
  [6, 0, "laundry", "Rug Row Thrift"],
  [6, 3, "bodega", "Corner Store"],
  [7, 0, "noodles", "Miners' Canteen"],
  [7, 3, "hardware", "Shaft Hardware"],
  [8, 0, "coffee", "Courier Cafe"],
  [8, 3, "pawn", "Gig Street Pawn"],
];
// The outer rooms: seven more corner stores, so there is one in every borough (Cold Harbor Deli keeps the freeze ray in its freezer),
// and six Silky stations.
const outers: readonly Shop[] = [
  [0, 0, "bodega", "Cold Harbor Deli"],
  [0, 3, "gas", "Silky"],
  [1, 3, "bodega", "Marina Mini Mart"],
  [2, 3, "bodega", "Floe Corner Store"],
  [3, 0, "gas", "Silky"],
  [3, 3, "bodega", "Neon Bodega"],
  [0, 2, "gas", "Silky"],
  [5, 0, "bodega", "Meme Market Deli"],
  [5, 3, "gas", "Silky"],
  [6, 0, "gas", "Silky"],
  [7, 0, "gas", "Silky"],
  // Diamond Hands, the seafront restaurant (`food.ts`).
  [1, 0, "restaurant", "Diamond Hands"],
  [7, 3, "bodega", "Shaft Stop and Shop"],
  [8, 0, "bodega", "Gig Street Grocery"],
];

// A room 11.2 m square, its front wall 1.4 m inside its lot's edge on a street: the middle street is south of a lot's upper half and
// north of its lower half, and an outer room faces the other way. The counter stands 2.6 m off the back wall. A shop stands at its lot's
// far end from the avenue; `west` puts a room elsewhere along the lot.
function roomOf(
  [borough, corner, kind, label]: Shop,
  outer: boolean,
  west = corner % 2 === 0 ? 1_540 : 9_340,
): Room {
  const bx = block * (borough % 3);
  const bz = block * Math.floor(borough / 3);
  const lower = corner >= 2;
  const north = lower !== outer;
  const front = bz + (outer ? (lower ? 11_060 : 940) : lower ? 7_140 : 4_860);
  const middle = bx + west + 560;
  return {
    borough,
    corner,
    counter: { x: middle, z: north ? front + 860 : front - 860 },
    door: north
      ? { x0: middle - 110, x1: middle + 110, z0: front - 240, z1: front + 60 }
      : { x0: middle - 110, x1: middle + 110, z0: front - 60, z1: front + 240 },
    id: `room-${String(borough)}-${String(corner)}${outer ? "-out" : ""}`,
    kind,
    label,
    north,
    outer,
    room: {
      x0: bx + west,
      x1: bx + west + 1_120,
      z0: north ? front : front - 1_120,
      z1: north ? front + 1_120 : front,
    },
  };
}

// Each hero's loft (`lofts.ts`), where they wake on a story day: on their borough's middle street in the north-west lot, between its shop
// and the avenue, or in the south-east lot where Mount WAGMI's lawns fill the others (Slip's is on the outer side of Nib's lot).
export const lofts: readonly Room[] = heroes.map((hero, id) => {
  const [corner, west] = hero.borough === 2 ? [3, 8_000] : [0, 2_900];
  return {
    ...roomOf(
      [hero.borough, corner, "loft", `${hero.name}'s loft`],
      hero.hidden,
      west,
    ),
    id: `loft-${String(id)}`,
  };
});

// The middle street's rooms (whose doorways the kerbs' parked rides keep clear of), then the outer rooms.
export const streetRooms: readonly Room[] = [
  ...shops.map((shop) => roomOf(shop, false)),
  ...lofts.filter(({ outer }) => !outer),
];
export const rooms: readonly Room[] = [
  ...streetRooms,
  ...outers.map((shop) => roomOf(shop, true)),
  ...lofts.filter(({ outer }) => outer),
];

// A point of a room in its own frame, in centimetres: across from its west wall, and out from its back wall toward the door.
export function insideAt(room: Room, across: number, out: number): Point {
  const back = room.north ? room.room.z1 : room.room.z0;
  return {
    x: room.room.x0 + across,
    z: back + (room.north ? -out : out),
  };
}

const within = (box: Box, x: number, z: number): boolean =>
  x >= box.x0 && x <= box.x1 && z >= box.z0 && z <= box.z1;
export const inRoom = (x: number, z: number): boolean =>
  rooms.some((one) => within(one.room, x, z) || within(one.door, x, z));
export const roomAt = (x: number, z: number): Room | null =>
  rooms.find((one) => within(one.room, x, z)) ?? null;
