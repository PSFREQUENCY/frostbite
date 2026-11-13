import { block } from "./constants.ts";
import type { Point } from "./types.ts";

// The mom-and-pop shops you can walk into: a room cut into a lot beside the street, with a doorway through its front wall and a counter at
// the back. Each borough has one or two. Feet may be in a room or its doorway as well as on the street (`world.ts`); the walls are the
// lot itself. The kind of shop decides what its counter sells (`talk.ts`).
interface Box {
  readonly x0: number;
  readonly x1: number;
  readonly z0: number;
  readonly z1: number;
}
export interface Room {
  readonly counter: Point;
  readonly door: Box;
  readonly id: string;
  readonly kind: string;
  readonly label: string;
  // Whether the doorway is in the room's north wall (the room is south of its street).
  readonly north: boolean;
  readonly room: Box;
}

// Borough, which corner lot (0 north-west, 1 north-east, 2 south-west, 3 south-east), kind, and the name over the door.
const shops: readonly (readonly [number, number, string, string])[] = [
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

export const rooms: readonly Room[] = shops.map(
  ([borough, corner, kind, label]) => {
    const bx = block * (borough % 3);
    const bz = block * Math.floor(borough / 3);
    const west = corner % 2 === 0 ? 1_540 : 9_340;
    const north = corner >= 2;
    const room = north
      ? { x0: bx + west, x1: bx + west + 1_120, z0: bz + 7_140, z1: bz + 8_260 }
      : {
          x0: bx + west,
          x1: bx + west + 1_120,
          z0: bz + 3_740,
          z1: bz + 4_860,
        };
    const middle = bx + west + 560;
    const door = north
      ? { x0: middle - 110, x1: middle + 110, z0: bz + 6_900, z1: bz + 7_200 }
      : { x0: middle - 110, x1: middle + 110, z0: bz + 4_800, z1: bz + 5_100 };
    return {
      counter: { x: middle, z: north ? bz + 8_000 : bz + 4_000 },
      door,
      id: `room-${String(borough)}-${String(corner)}`,
      kind,
      label,
      north,
      room,
    };
  },
);

const within = (box: Box, x: number, z: number): boolean =>
  x >= box.x0 && x <= box.x1 && z >= box.z0 && z <= box.z1;
export const inRoom = (x: number, z: number): boolean =>
  rooms.some((one) => within(one.room, x, z) || within(one.door, x, z));
export const roomAt = (x: number, z: number): Room | null =>
  rooms.find((one) => within(one.room, x, z)) ?? null;
