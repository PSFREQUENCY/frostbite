import type { Matrix4 } from "three";

import { block, lots } from "../rules/constants.ts";
import { rooms } from "../rules/rooms.ts";
import { box, hash } from "./hash.ts";
import type { Shell } from "./shell.ts";
import { venueLots } from "./venue-lots.ts";

// How each borough builds (`blocks.ts` draws it): the floors of the low buildings round each lot, the height of the tower set back in its
// middle (none in the park and the market), the trees on its pavements, the neon trim of its windows, and its two wall colours.
export interface Style {
  readonly core: readonly [number, number] | null;
  readonly floors: readonly [number, number];
  readonly trees: "palm" | "pine" | null;
  readonly trim: string | null;
  readonly walls: readonly [string, string];
}
type Row = readonly [
  Style["core"],
  Style["floors"],
  Style["trees"],
  Style["trim"],
  Style["walls"],
];
const table: readonly Row[] = [
  [[16, 26], [2, 4], null, null, ["#8c4a36", "#6e2f26"]],
  [[12, 22], [1, 3], "palm", null, ["#f7c6a3", "#cfe8e0"]],
  [null, [2, 3], "pine", null, ["#dfe9f2", "#c9d7e3"]],
  [[40, 80], [3, 5], null, "#ff3df2", ["#2a2350", "#1d1b33"]],
  [[50, 120], [3, 6], null, "#5beac6", ["#2c5b86", "#21405f"]],
  [null, [1, 3], "palm", null, ["#ff8a5b", "#ffd166"]],
  [[18, 30], [2, 4], null, "#ffd166", ["#a14a35", "#8c3b2e"]],
  [[14, 28], [1, 2], null, "#ffb000", ["#5d6470", "#4a4f58"]],
  [[20, 34], [2, 4], "pine", "#ff9a3c", ["#b0603e", "#9a4a32"]],
];
export const styles: readonly Style[] = table.map(
  ([core, floors, trees, trim, walls]) => ({
    core,
    floors,
    trees,
    trim,
    walls,
  }),
);

export interface Builders {
  readonly fronts: Shell;
  readonly high: Shell;
  readonly low: Shell;
  readonly roofs: [Matrix4, string][];
  readonly tanks: [Matrix4, string][];
}

const depth = 9;
const floorHeight = 3.2;
// A row of buildings along one side of a lot, from `from` to `to` (metres along the side), each 6 to 12 metres wide.
function row(
  from: number,
  to: number,
  seed: number,
  each: (a: number, b: number, roll: number) => void,
): void {
  let at = from;
  for (let index = 0; to - at > 0.5; index += 1) {
    const roll = hash(seed, index, 17);
    const width = to - at < 15 ? to - at : 6 + roll * 6;
    each(at, at + width, roll);
    at += width;
  }
}

// One lot: a ring of low buildings (faces 0 north, 1 east, 2 south, 3 west), a shop front on the ground floor of many, and the tower.
// The shop you can walk into takes its place in the row on the middle street (`shops.ts` builds it), and the rows beside it stop short.
// The tower set back in the middle of a lot (metres), if it has one: none in the park and the market, under Moon Tower, or on a landmark.
export function coreOf(
  borough: number,
  corner: number,
): {
  readonly box: readonly [number, number, number, number];
  readonly height: number;
} | null {
  const look = styles[borough];
  if (look?.core == null || (borough === 4 && corner === 1)) return null;
  if (venueLots[`${String(borough)}-${String(corner)}`] !== undefined)
    return null;
  const roll = hash(borough, corner, 99);
  const [x0, z0] = cornerOf(borough, corner);
  return {
    box: [x0 + 13, x0 + 29, z0 + 13, z0 + 29],
    height: look.core[0] + (look.core[1] - look.core[0]) * roll,
  };
}
// The north-west corner of a lot (metres).
export const cornerOf = (
  borough: number,
  corner: number,
): readonly [number, number] => [
  (block * (borough % 3) + (lots[corner % 2]?.[0] ?? 0)) / 100,
  (block * Math.floor(borough / 3) + (lots[Math.floor(corner / 2)]?.[0] ?? 0)) /
    100,
];

export function buildLot(
  borough: number,
  corner: number,
  into: Builders,
): void {
  const look = styles[borough];
  if (look === undefined) return;
  if (venueLots[`${String(borough)}-${String(corner)}`] !== undefined) return;
  const lane = Math.floor(corner / 2);
  const column = corner % 2;
  const [north, south] = lots[lane] ?? [0, 0];
  const [west, east] = lots[column] ?? [0, 0];
  const x0 = (block * (borough % 3) + west) / 100;
  const x1 = (block * (borough % 3) + east) / 100;
  const z0 = (block * Math.floor(borough / 3) + north) / 100;
  const z1 = (block * Math.floor(borough / 3) + south) / 100;
  const seed = borough * 4 + corner;
  const street = lane === 0 ? 2 : 0;
  const building = (
    [bx0, bx1, bz0, bz1]: readonly [number, number, number, number],
    roll: number,
    face: number,
  ): void => {
    const floors =
      look.floors[0] + Math.floor(roll * (look.floors[1] - look.floors[0] + 1));
    const height = floors * floorHeight + 0.6;
    into.low.block(
      bx0,
      bx1,
      bz0,
      bz1,
      height,
      0.82 + roll * 0.18,
      Math.floor(roll * 4),
    );
    const [cx, cz] = [(bx0 + bx1) / 2, (bz0 + bz1) / 2];
    if (roll > 0.55)
      into.roofs.push([box(cx, height + 0.5, cz, 1.6, 1, 1.2), "#9aa3b5"]);
    if (roll < 0.2)
      into.tanks.push([box(cx, height + 1.2, cz, 1.6, 2.4, 1.6), "#8a6a4a"]);
    // A little shop on the ground floor of most buildings on a street, fewer on an avenue.
    const inner = face === street || face === (column === 0 ? 1 : 3);
    if (roll * 10 - Math.floor(roll * 10) > (inner ? 0.65 : 0.3)) return;
    const kind = Math.floor(hash(seed, Math.round(bx0 * 10 + bz0), 3) * 8);
    const u0 = (kind % 4) / 4;
    const v0 = kind < 4 ? 0.5 : 0;
    const uv = [u0, v0, u0 + 0.25, v0 + 0.5] as const;
    const out = 0.06;
    const sides = [
      [bx1, bz0 - out, bx0, bz0 - out],
      [bx1 + out, bz1, bx1 + out, bz0],
      [bx0, bz1 + out, bx1, bz1 + out],
      [bx0 - out, bz0, bx0 - out, bz1],
    ] as const;
    const side = sides[face];
    if (side !== undefined) into.fronts.quad(side, 0, 4, uv);
  };
  const shop = rooms.find(
    (room) => room.id === `room-${String(borough)}-${String(corner)}`,
  );
  const gap =
    shop === undefined
      ? null
      : ([shop.room.x0 / 100 - 0.4, shop.room.x1 / 100 + 0.4] as const);
  for (const face of [0, 2]) {
    const z = face === 0 ? z0 : z1 - depth;
    const runs =
      gap !== null && face === street
        ? [
            [x0, gap[0]],
            [gap[1], x1],
          ]
        : [[x0, x1]];
    for (const [from = x0, to = x1] of runs)
      row(from, to, seed * 8 + face, (a, b, roll) =>
        building([a, b, z, z + depth], roll, face),
      );
  }
  // The rows down the sides stop short of the shop's back wall where the shop is on their side.
  const near = shop === undefined ? null : shop.room;
  for (const face of [1, 3]) {
    const x = face === 3 ? x0 : x1 - depth;
    const clipped = near !== null && face === (column === 0 ? 3 : 1);
    const from = clipped && lane === 1 ? near.z1 / 100 + 0.4 : z0 + depth;
    const to = clipped && lane === 0 ? near.z0 / 100 - 0.4 : z1 - depth;
    row(from, to, seed * 8 + face, (a, b, roll) =>
      building([x, x + depth, a, b], roll, face),
    );
  }
  // The tower, set back from the pavement.
  const core = coreOf(borough, corner);
  if (core === null) return;
  const [cx0, cx1, cz0, cz1] = core.box;
  const roll = hash(borough, corner, 99);
  into.high.block(
    cx0,
    cx1,
    cz0,
    cz1,
    core.height,
    0.85 + roll * 0.15,
    Math.floor(roll * 4),
  );
}
