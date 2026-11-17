import type { Prop } from "./shop-props.ts";

// Inside a corner store and a Gwei Gas station (`shop-props.ts` keeps the other kinds): the counter's bulletproof glass, floor to
// ceiling, with its tray and speaking grille; shelves of goods behind the clerk; aisles of snacks down the middle; a wall of glass-door
// freezers lit from inside, full of colour; a chest freezer by the window; and an OPEN sign. A gas station has one aisle, a hot-dog
// roller on its counter, a cooler of Fuzzy lit purple and a coin ATM by the window. In each shop's own frame (`shop-props.ts`).
const goods = [
  "#ff5d5d",
  "#ffd166",
  "#5beac6",
  "#ff9ecf",
  "#6aa8ff",
  "#ff8a3c",
];
const tint = (k: number): string => goods[k % goods.length] ?? "#ffffff";
const glass = (
  u: number,
  w: number,
  y: number,
  width: number,
  height: number,
  deep: number,
): Prop => [u, w, y, width, height, deep, "#cfefff", "glass"];

const counterGlass: readonly Prop[] = [
  glass(5.6, 2.1, 2.35, 4.2, 2.5, 0.06),
  glass(3.47, 1.4, 2.35, 0.06, 2.5, 1.4),
  glass(7.73, 1.4, 2.35, 0.06, 2.5, 1.4),
  [5.6, 2.22, 1.13, 0.6, 0.06, 0.4, "#8a93a6"],
  [5.6, 2.06, 1.75, 0.3, 0.2, 0.03, "#3a3f47"],
  [5.6, 2.1, 3.62, 4.3, 0.08, 0.1, "#8a93a6"],
];
const backShelves: readonly Prop[] = [1.4, 2, 2.6].flatMap((y): Prop[] => [
  [5.6, 0.25, y - 0.05, 7.2, 0.05, 0.45, "#3a3f47"],
  ...Array.from({ length: 14 }, (_, k): Prop => [
    2.3 + k * 0.5,
    0.3,
    y + 0.12,
    0.3,
    0.25,
    0.25,
    tint(k + Math.round(y * 3)),
  ]),
]);
// An aisle of shelves running from near the counter toward the door, with goods facing out on both sides and a lit sign on top.
const aisle = (u: number, sign: string): readonly Prop[] => [
  [u, 6.25, 0.8, 1, 1.6, 4.5, "#5d6470"],
  [u, 6.25, 1.68, 1.1, 0.08, 4.6, "#3a3f47"],
  [u, 4, 2, 0.9, 0.35, 0.05, sign, true],
  ...[-1, 1].flatMap((side) =>
    [0.45, 0.85, 1.25].flatMap((y) =>
      Array.from({ length: 9 }, (_, k): Prop => [
        u + side * 0.55,
        4.3 + k * 0.48,
        y,
        0.12,
        0.3,
        0.34,
        tint(k + side + Math.round(y * 5)),
      ]),
    ),
  ),
];
// The wall of freezers down the left side, lit inside, behind glass doors in dark frames.
const freezers = (light: string): readonly Prop[] => [
  [0.45, 6.7, 1.1, 0.9, 2.2, 7, "#d9dee8"],
  [0.62, 6.7, 1.15, 0.5, 1.9, 6.8, light, true],
  ...[0.55, 1.05, 1.55].flatMap((y) =>
    Array.from({ length: 13 }, (_, k): Prop => [
      0.62,
      3.5 + k * 0.5,
      y,
      0.3,
      0.32,
      0.3,
      tint(k * 2 + Math.round(y * 4)),
    ]),
  ),
  glass(0.93, 6.7, 1.15, 0.04, 1.95, 6.9),
  ...Array.from({ length: 6 }, (_, k): Prop => [
    0.96,
    3.2 + k * 1.4,
    1.15,
    0.06,
    2,
    0.06,
    "#3a3f47",
  ]),
];

export const storeProps: Readonly<Record<string, readonly Prop[]>> = {
  bodega: [
    ...counterGlass,
    ...backShelves,
    ...aisle(3.3, "#ff5d5d"),
    ...aisle(7.9, "#5beac6"),
    ...freezers("#c9f0ff"),
    [9.6, 9.4, 0.45, 1.6, 0.9, 0.9, "#f4f8ff"],
    [9.6, 9.4, 0.72, 1.4, 0.3, 0.7, "#c9f0ff", true],
    glass(9.6, 9.4, 0.93, 1.5, 0.04, 0.8),
    [9.3, 2.7, 0.75, 0.9, 1.5, 0.5, "#c0392b"],
    [2.5, 11, 2.5, 1.4, 0.35, 0.05, "#ff3df2", true],
    [5.6, 6, 3.55, 8, 0.05, 0.25, "#fff6d8", true],
  ],
  gas: [
    ...counterGlass,
    ...backShelves,
    ...aisle(4.2, "#ffd166"),
    ...freezers("#d8b6ff"),
    [7, 1.8, 1.24, 0.6, 0.22, 0.45, "#c0c6d0"],
    [7, 1.8, 1.36, 0.5, 0.06, 0.35, "#ff9a3c", true],
    [10.6, 9, 0.95, 0.7, 1.9, 0.7, "#1d2433"],
    [10.24, 9, 1.35, 0.03, 0.5, 0.45, "#5beac6", true],
    [10.24, 9, 1.86, 0.03, 0.16, 0.5, "#ffd166", true],
    [8.6, 11, 2.5, 1.6, 0.35, 0.05, "#5beac6", true],
    [5.6, 6, 3.55, 8, 0.05, 0.25, "#fff6d8", true],
  ],
};
