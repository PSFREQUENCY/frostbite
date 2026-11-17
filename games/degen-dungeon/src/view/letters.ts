import { letters } from "../rules/mountain.ts";

// The WAGMI letters' shapes, as Mount WAGMI's sign stands them (`wagmi.ts` builds them): tall block capitals ten metres high, each an
// outline in metres along the letter from its north end (the left as the city sees it) and up from its foot, the A with its hole; how
// high a letter's top is anywhere along it, so a sitter sits on it; and the way up each stroke to a seat, so a climber keeps to it.
export const letterHeight = 10.2;
const tall = letterHeight;
export type Outline = readonly (readonly [number, number])[];

// A G: the outer curve round from its upper tip to its right side, the bar in, and the inner curve back round to the tip.
function gOutline(): Outline {
  const [cx, cy, rx, ry, stroke] = [3.5, tall / 2, 3.5, tall / 2, 1.55];
  const arc = (from: number, to: number, count: number, out: number): Outline =>
    Array.from({ length: count + 1 }, (_, step) => {
      const angle = ((from + ((to - from) * step) / count) * Math.PI) / 180;
      return [
        cx + (rx - out) * Math.cos(angle),
        cy + (ry - out) * Math.sin(angle),
      ] as const;
    });
  const low = (Math.asin((3.65 - cy) / (ry - stroke)) * 180) / Math.PI;
  return [
    ...arc(40, 360, 32, 0),
    [3.7, cy],
    [3.7, 3.65],
    ...arc(low, -320, 30, stroke),
  ];
}

// Each letter's outline (metres: along it from its north end, and up), and the A's hole.
export const outlines: Readonly<
  Record<string, { readonly hole?: Outline; readonly outer: Outline }>
> = {
  A: {
    hole: [
      [2.55, 3.8],
      [4.45, 3.8],
      [3.5, 7.6],
    ],
    outer: [
      [0, 0],
      [2.6, tall],
      [4.4, tall],
      [7, 0],
      [5.4, 0],
      [4.85, 2.3],
      [2.15, 2.3],
      [1.6, 0],
    ],
  },
  G: { outer: gOutline() },
  I: {
    outer: [
      [0, 0],
      [2.5, 0],
      [2.5, tall],
      [0, tall],
    ],
  },
  M: {
    outer: [
      [0, 0],
      [0, tall],
      [1.75, tall],
      [4.25, 3.9],
      [6.75, tall],
      [8.5, tall],
      [8.5, 0],
      [6.95, 0],
      [6.95, 6.4],
      [4.25, 1.6],
      [1.55, 6.4],
      [1.55, 0],
    ],
  },
  W: {
    outer: [
      [0, tall],
      [1.55, tall],
      [2.55, 3.6],
      [3.75, 7.34],
      [5.25, 7.34],
      [6.45, 3.6],
      [7.45, tall],
      [9, tall],
      [7.2, 0],
      [5.75, 0],
      [4.5, 5.6],
      [3.25, 0],
      [1.8, 0],
    ],
  },
};

// How high a letter's top is (metres above its foot) at a distance along it (metres from its north end): the highest of its outline's
// edges over that point.
export function topOf(char: string, along: number): number {
  const outline = outlines[char]?.outer ?? [];
  let top = 0;
  outline.forEach(([x0, y0], index) => {
    const [x1, y1] = outline[(index + 1) % outline.length] ?? [x0, y0];
    if (along < Math.min(x0, x1) || along > Math.max(x0, x1)) return;
    top = Math.max(
      top,
      x0 === x1
        ? Math.max(y0, y1)
        : y0 + ((along - x0) / (x1 - x0)) * (y1 - y0),
    );
  });
  return top;
}
// How high above the terrace a sitter's seat is, at a point of the sign (cm, as the rules keep it).
export function seatHeight(z: number): number {
  const letter = letters.find((one) => z >= one.z0 - 30 && z <= one.z1 + 30);
  if (letter === undefined) return tall;
  const along = Math.min(
    (letter.z1 - letter.z0) / 100,
    Math.max(0, (z - letter.z0) / 100),
  );
  return topOf(letter.char, along);
}

// The way up to each seat (metres along the letter, and up): the stroke under it, a W's and an A's slanting legs, round a G's curve,
// and straight up an M's stems and the I. A climber's body follows it as they go up (`climbing.ts`).
const lines: Readonly<Record<number, Outline>> = {
  4_078: [
    [2.5, 0],
    [0.78, tall],
  ],
  4_450: [
    [2.5, 0],
    [4.5, 7.34],
  ],
  4_822: [
    [6.5, 0],
    [8.22, tall],
  ],
  5_400: [
    [0.8, 0],
    [3.5, tall],
  ],
  6_250: [
    [3.5, 0],
    [1.57, 2.04],
    [0.78, tall / 2],
    [1.57, 8.16],
    [3.5, tall],
  ],
  6_838: [
    [0.78, 0],
    [0.88, tall],
  ],
  7_512: [
    [7.72, 0],
    [7.62, tall],
  ],
  7_875: [
    [1.25, 0],
    [1.25, tall],
  ],
};
export const climbSeats = Object.keys(lines).map(Number);
// Where along the sign (metres, south) a climber going up to a seat (cm) is at a height (metres above the terrace).
export function climbAcross(seat: number, height: number): number {
  const letter = letters.find((one) => seat >= one.z0 && seat <= one.z1);
  const line = lines[seat] ?? [];
  const first = line[0];
  if (letter === undefined || first === undefined) return seat / 100;
  let along = first[0];
  line.forEach(([u0, y0], index) => {
    const [u1, y1] = line[index + 1] ?? [u0, y0];
    if (height >= y0 && y1 > y0)
      along = u0 + (u1 - u0) * Math.min(1, (height - y0) / (y1 - y0));
  });
  return letter.z0 / 100 + along;
}
