// What is inside each kind of shop (`shops.ts` builds it): the props, and the colours of the floor, the walls and the front.
// A piece of a shop in its own frame: across from the left wall (u), out from the back wall (w), up from the floor; size; colour; glow.
export type Prop = readonly [
  u: number,
  w: number,
  y: number,
  width: number,
  height: number,
  deep: number,
  colour: string,
  glow?: boolean,
];
export const props: Readonly<Record<string, readonly Prop[]>> = {
  arcade: [0, 1, 2, 3].flatMap((k): Prop[] => [
    [1.2 + k * 2.6, 6.2, 0.9, 1, 1.8, 0.9, "#2a2350"],
    [
      1.2 + k * 2.6,
      5.72,
      1.3,
      0.8,
      0.6,
      0.05,
      ["#ff3df2", "#5beac6", "#ffd166", "#6aa8ff"][k] ?? "#ffffff",
      true,
    ],
  ]),
  bait: [
    [1, 4, 0.9, 1.6, 0.9, 0.7, "#2c6f8a", true],
    [10.2, 4, 0.9, 1.6, 0.9, 0.7, "#2c6f8a", true],
    ...[0, 1, 2, 3, 4].map((k): Prop => [
      0.3,
      5 + k * 0.6,
      1.6,
      0.06,
      2.6,
      0.06,
      "#8a6a4a",
    ]),
  ],
  barber: [
    [2.5, 6, 0.55, 0.8, 1.1, 0.8, "#d64545"],
    [8.7, 6, 0.55, 0.8, 1.1, 0.8, "#d64545"],
    [5.6, 9.5, 1.6, 6, 1.4, 0.05, "#bfe9ff", true],
  ],
  bodega: [
    ...[0, 1].flatMap((k): Prop[] => [
      [3 + k * 5, 6.5, 0.9, 3, 1.8, 0.6, "#5d6470"],
      ...[0, 1, 2, 3, 4, 5].map((j): Prop => [
        1.8 + k * 5 + j * 0.45,
        6.2,
        0.5 + (j % 3) * 0.55,
        0.35,
        0.35,
        0.3,
        ["#ff5d5d", "#ffd166", "#5beac6", "#ff9ecf"][j % 4] ?? "#ffffff",
      ]),
    ]),
    [0.5, 5, 1, 0.8, 2, 2.4, "#9fd8ff", true],
  ],
  coffee: [
    [4.4, 1.5, 1.35, 0.7, 0.6, 0.5, "#c0c6d0"],
    [5.6, 0.08, 2.4, 3.4, 1.2, 0.05, "#ffd166", true],
    [2, 8.5, 0.75, 1.2, 0.08, 1.2, "#8a5a3a"],
    [9.2, 8.5, 0.75, 1.2, 0.08, 1.2, "#8a5a3a"],
  ],
  gym: [
    [2, 6, 0.9, 2.4, 1.8, 0.4, "#2a2f45"],
    [2, 5.6, 0.9, 2.6, 0.08, 0.08, "#c0c6d0"],
    [8.5, 6.5, 0.45, 2, 0.3, 0.6, "#11131c"],
    [5.6, 10.6, 1.6, 6, 1.6, 0.05, "#bfe9ff", true],
  ],
  hardware: [
    [5.6, 0.08, 2, 7, 1.8, 0.05, "#c9a46a"],
    ...[0, 1, 2, 3, 4, 5, 6].map((k): Prop => [
      2.6 + k,
      0.15,
      1.6 + (k % 2) * 0.6,
      0.2,
      0.5,
      0.1,
      k % 2 === 0 ? "#ff8a3c" : "#5d6470",
    ]),
    [3, 6.5, 0.9, 3, 1.8, 0.6, "#5d6470"],
  ],
  laundry: [0, 1, 2, 3, 4].flatMap((k): Prop[] => [
    [0.6, 4 + k * 1.1, 0.5, 0.9, 1, 0.9, "#f4f8ff"],
    [1.06, 4 + k * 1.1, 0.55, 0.04, 0.5, 0.5, "#2c4f7a", true],
  ]),
  noodles: [
    [10.4, 6, 0.55, 0.8, 1.1, 5, "#8a5a3a"],
    ...[0, 1, 2].map((k): Prop => [
      5.6 + (k - 1) * 3,
      4,
      3.1,
      0.5,
      0.6,
      0.5,
      "#ff5d5d",
      true,
    ]),
  ],
  pawn: [
    [2.5, 6, 0.5, 2.4, 1, 0.9, "#9fd8ff", true],
    [8.7, 6, 0.5, 2.4, 1, 0.9, "#9fd8ff", true],
    ...[0, 1, 2].map((k): Prop => [
      9 + k * 0.6,
      0.2,
      1.8,
      0.35,
      1.1,
      0.1,
      "#c98a4b",
    ]),
  ],
  pizza: [
    [2, 1, 0.9, 1.8, 1.6, 1.4, "#b0603e"],
    [2, 1.72, 0.7, 0.9, 0.5, 0.05, "#ff9a3c", true],
    [8.5, 8, 0.75, 1.4, 0.08, 1.4, "#e63946"],
  ],
};
export const walls: Readonly<
  Record<string, readonly [floor: string, wall: string, front: string]>
> = {
  arcade: ["#1d1b33", "#2a2350", "#14122a"],
  bait: ["#6b5a3a", "#3f6f7a", "#2f4f5a"],
  barber: ["#e8ecf5", "#3a3f47", "#1b1e2a"],
  bodega: ["#c9c2b0", "#ffd166", "#d64545"],
  coffee: ["#8a5a3a", "#f3e3c3", "#2f6f57"],
  gym: ["#2a2f45", "#5d6470", "#11131c"],
  hardware: ["#8a7a5a", "#c9b38a", "#ff8a3c"],
  laundry: ["#cfe8e0", "#9fd8ff", "#2f6fb5"],
  noodles: ["#5e3a2f", "#e8c9a0", "#a12f2f"],
  pawn: ["#3a3346", "#5a4a6a", "#c98a4b"],
  pizza: ["#d9c7a3", "#f7f3d7", "#3fae6b"],
};
