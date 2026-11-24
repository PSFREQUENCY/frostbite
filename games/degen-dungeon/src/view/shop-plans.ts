import { rooms, type Room } from "../rules/rooms.ts";
import { centreOf, onStreet } from "../rules/world.ts";
import { hash } from "./hash.ts";
import { coats, skins, type Doing, type Plan } from "./insider-plans.ts";
import { frameOf, front } from "./shops.ts";

// More of Nakasato's people (`insiders.ts` draws them, `insider-plans.ts` the halls'): shoppers in every walk-in shop (browsing the
// aisles, walking them, waiting at the counter; eating at the noodle bars, the coffee shops and Diamond Hands; at the machines in the
// laundromat and the gym; in the barber's chair), a driver at each Silky pump while a car fills up (`forecourts.ts` draws the cars), and
// on every borough's middle streets skaters rolling by and shoppers carrying their bags. Nobody here is anyone in particular.

// A walk-in shop's place number, and a borough's streets' (a landmark's is its index, the bazaar's -1).
export const roomPlace = (index: number): number => 1_000 + index;
export const streetPlace = (borough: number): number => 2_000 + borough;

// When a car stands at a Silky pump (seconds): it pulls in over the first four of every thirty-six, stands twenty-four, pulls out over
// four, and the pump stands empty four; each pump and station on its own beat.
export const pumpPeriod = 36;
export const pumpOffset = (station: number, pump: number): number =>
  station * 7 + pump * 18;
export const pumps = [3.4, 7.8] as const;

const dress = (salt: number) => ({
  coat: coats[Math.floor(hash(salt, 3, 1) * coats.length)] ?? "#ffd166",
  phase: hash(salt, 3, 4) * 10,
  skin: skins[Math.floor(hash(salt, 3, 2) * skins.length)] ?? "#c68642",
});
const base = {
  bag: false,
  face: 0,
  pace: 0,
  r: 0,
  rise: 0,
  to: [0, 0] as const,
  y: 0,
};

// Who is in a shop of a kind, in its own frame: what they do, across (u) and out from the back (w), and the way they face, as a step in
// the frame (toward the back, the counter, is w going down).
type Spec = readonly [Doing, number, number, number, number];
const browse = (u: number, w: number, side: number): Spec => [
  "stand",
  u,
  w,
  side,
  0,
];
const counter = (u: number): Spec => ["stand", u, 3.1, 0, -1];
const sit = (u: number, w: number): Spec => ["sit", u, w, 0, -1];
const people: Readonly<Record<string, readonly Spec[]>> = {
  arcade: [browse(2.4, 6, -1), browse(8.8, 6, 1), browse(2.4, 8.2, -1)],
  bait: [browse(2.2, 6.5, -1), counter(5.6)],
  barber: [sit(3, 5), browse(4, 5.3, -1), sit(8.5, 8.5)],
  bodega: [
    browse(4.3, 5.4, -1),
    browse(6.9, 7.2, 1),
    counter(5.4),
    ["line", 5.6, 9.6, 0, 0],
  ],
  coffee: [counter(5), sit(2.4, 7), sit(3.4, 7.4), sit(8.6, 8.2)],
  gas: [browse(5.2, 6, -1), counter(5.4), ["line", 7, 9.6, 0, 0]],
  gym: [
    ["trade", 3, 6, 0, -1],
    ["dance", 6, 7, 0, -1],
    ["trade", 8.6, 6.5, 0, -1],
  ],
  hardware: [browse(2.2, 6.2, -1), browse(8.8, 7, 1), counter(5.8)],
  laundry: [browse(1.6, 5.5, -1), browse(1.6, 8, -1), sit(8.8, 7.5)],
  noodles: [counter(5.6), sit(2.6, 6.8), sit(4.2, 6.8), sit(8.2, 7.6)],
  pawn: [browse(2.2, 6.4, -1), counter(5.4)],
  pizza: [counter(5.2), sit(2.6, 7.2), sit(8.4, 7.2)],
  restaurant: [
    sit(2.6, 6),
    sit(3.8, 6),
    sit(7.4, 6.5),
    sit(8.6, 6.5),
    sit(3.2, 9),
    sit(8, 9),
  ],
};

function inShop(room: Room, index: number): Plan[] {
  const { out, toX, toZ } = frameOf(room);
  const place = roomPlace(index);
  return (people[room.kind] ?? []).map(([doing, u, w, du, dw], k) => {
    const salt = index * 16 + k;
    // A walker goes up and down the shop, from by the door to the counter.
    const walking = doing === "line";
    return {
      ...base,
      ...dress(salt),
      bag: walking,
      doing,
      face: Math.atan2(du, dw * out),
      pace: walking ? 0.7 : 0,
      place,
      to: walking ? [toX(u), toZ(3.4)] : base.to,
      x: toX(u),
      z: toZ(w),
    };
  });
}

// At each Silky, a driver by each pump while a car fills up there: standing by the hose, facing the car.
function atPumps(room: Room, index: number, station: number): Plan[] {
  const { out, toX, toZ } = frameOf(room);
  return pumps.map((u, pump) => ({
    ...base,
    ...dress(500 + station * 2 + pump),
    doing: "stand" as const,
    face: out === 1 ? 0 : Math.PI,
    place: roomPlace(index),
    when: [
      pumpOffset(station, pump) + 5,
      pumpOffset(station, pump) + 27,
    ] as const,
    x: toX(u + 0.9),
    z: toZ(front + 3.6 + 1.4),
  }));
}

// On each borough's two middle streets, a little off the middle: two skaters up and down one, three shoppers with bags along the other.
// Only stretches that are street all the way are used.
const clear = (x0: number, z0: number, x1: number, z1: number): boolean => {
  for (let part = 0; part <= 20; part += 1)
    if (!onStreet(x0 + ((x1 - x0) * part) / 20, z0 + ((z1 - z0) * part) / 20))
      return false;
  return true;
};
function onStreets(borough: number): Plan[] {
  const { x, z } = centreOf(borough);
  const plans: Plan[] = [];
  const lane = (
    doing: Doing,
    from: readonly [number, number],
    to: readonly [number, number],
    salt: number,
    pace: number,
  ): void => {
    if (!clear(from[0], from[1], to[0], to[1])) return;
    plans.push({
      ...base,
      ...dress(800 + borough * 8 + salt),
      bag: doing === "line",
      doing,
      pace,
      phase: hash(borough, salt, 9) * 3,
      place: streetPlace(borough),
      to: [to[0] / 100, to[1] / 100],
      x: from[0] / 100,
      z: from[1] / 100,
    });
  };
  for (const [salt, side] of [
    [0, 350],
    [1, -350],
  ] as const)
    lane(
      "skate",
      [x + side, z - 4_000],
      [x + side, z + 4_000],
      salt,
      4.2 + salt * 0.6,
    );
  for (const [salt, side] of [
    [2, 420],
    [3, -420],
    [4, 420],
  ] as const)
    lane(
      "line",
      [x - 4_000, z + side],
      [x + 4_000, z + side],
      salt,
      0.9 + salt * 0.1,
    );
  return plans;
}

export const shopPlans: readonly Plan[] = rooms.flatMap((room, index) => [
  ...inShop(room, index),
  ...(room.kind === "gas"
    ? atPumps(
        room,
        index,
        rooms.filter(({ kind }, at) => kind === "gas" && at < index).length,
      )
    : []),
]);
export const streetPlans: readonly Plan[] = Array.from(
  { length: 9 },
  (_, borough) => onStreets(borough),
).flat();
