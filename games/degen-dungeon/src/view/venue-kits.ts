import type { Venue, VenueKind } from "../rules/venues.ts";
import type { Handle, Props } from "./props.ts";

// What is inside each landmark, placed round its middle (metres): `a` across the floor, `b` toward the doorway, `y` up. Everything is
// rounded where it can be: pills, discs, balls, rings and posts. Handles come back for what moves or changes colour at night.
export interface Inside {
  readonly beams: Handle[];
  readonly lights: Handle[];
}
export type Place = (
  a: number,
  b: number,
  y: number,
) => readonly [number, number, number];

const neon = [
  "#ff3df2",
  "#5beac6",
  "#ffd166",
  "#6aa8ff",
  "#ff8a5b",
  "#7be36b",
] as const;
export const tint = (index: number): string =>
  neon[Math.abs(index) % neon.length] ?? "#ffffff";
// Points round a circle of `radius` metres, from `from` to `to` (radians, 0 toward the doorway), `count` of them, with their angle.
const around = (
  count: number,
  radius: number,
  from = 0,
  to = Math.PI * 2,
): (readonly [number, number, number])[] =>
  Array.from({ length: count }, (_, index) => {
    const angle = from + ((to - from) * (index + 0.5)) / count;
    return [Math.sin(angle) * radius, Math.cos(angle) * radius, angle] as const;
  });

export function furnish(kind: VenueKind, at: Place, props: Props): Inside {
  const inside: Inside = { beams: [], lights: [] };
  const put = (
    shape: Parameters<Props["add"]>[0],
    [a, b, y]: readonly [number, number, number],
    size: readonly [number, number, number],
    colour: string,
    glow = false,
    turn: readonly [number, number, number] = [0, 0, 0],
  ): Handle => props.add(shape, at(a, b, y), size, colour, glow, turn);
  const seat = (a: number, b: number, colour: string): void => {
    put("pill", [a, b, 0.45], [1, 0.5, 0.7], colour);
    put("pill", [a, b - 0.35, 0.85], [1, 0.6, 0.25], colour);
  };
  const lit = (handle: Handle): void => void inside.lights.push(handle);
  switch (kind) {
    case "club":
      for (let row = -2; row <= 2; row += 1)
        for (let col = -2; col <= 2; col += 1)
          lit(
            put(
              "disc",
              [col * 2.1, row * 2.1, 0.06],
              [1.9, 1, 1.9],
              tint(row + col),
              true,
            ),
          );
      put("pill", [0, -11, 1], [7, 1.6, 2.2], "#2a2350");
      put("pill", [0, -10.4, 1.7], [6, 0.2, 0.3], "#ff3df2", true);
      for (const a of [-8, 8])
        put("post", [a, -11, 1.8], [1.6, 3.6, 1.6], "#11131c");
      lit(put("ball", [0, 0, 7.5], [1.4, 1.4, 1.4], "#f4f8ff", true));
      for (const [a, b] of around(10, 14, 0.9, Math.PI * 2 - 0.9))
        seat(a, b, "#3a1d5c");
      for (let k = 0; k < 3; k += 1)
        inside.beams.push(
          put("cone", [-6 + k * 6, -6, 4], [1.6, 8, 1.6], tint(k), true),
        );
      return inside;
    case "cinema":
      lit(put("box", [0, -15.5, 5], [24, 9, 0.3], "#6aa8ff", true));
      for (let row = 0; row < 5; row += 1)
        for (let col = -4; col <= 4; col += 1)
          seat(col * 1.4, -6 + row * 2.4, "#b3263a");
      for (const a of [-7.5, 7.5])
        for (let k = 0; k < 4; k += 1)
          put(
            "ball",
            [a, -6 + k * 3, 0.15],
            [0.25, 0.25, 0.25],
            "#ffd166",
            true,
          );
      return inside;
    case "dome":
      for (const [a, b, angle] of around(8, 10)) {
        put("pill", [a, b, 1.3], [2.6, 1.4, 1.4], "#f4f8ff", false, [
          0,
          0,
          Math.PI / 2,
        ]);
        put(
          "ball",
          [a * 0.93, b * 0.93, 1.9],
          [0.7, 0.35, 0.7],
          "#5beac6",
          true,
          [0, angle, 0],
        );
      }
      lit(put("ball", [0, 0, 3.5], [3, 3, 3], "#5beac6", true));
      put("ring", [0, 0, 0.1], [14, 14, 14], "#5beac6", true, [
        Math.PI / 2,
        0,
        0,
      ]);
      return inside;
    case "arcade":
      for (let row = -1; row <= 1; row += 1)
        for (let col = -3; col <= 3; col += 1) {
          put("box", [col * 2.6, row * 5, 1], [1.4, 2, 1], "#2a2350");
          lit(
            put(
              "box",
              [col * 2.6, row * 5 + 0.51, 1.35],
              [1.1, 0.8, 0.05],
              tint(row * 7 + col),
              true,
            ),
          );
        }
      put("post", [0, -12, 1.4], [3, 2.8, 3], "#9fd8ff");
      return inside;
    case "gallery":
      for (const [a, b, angle] of around(12, 17.4, 0.6, Math.PI * 2 - 0.6))
        lit(
          put(
            "box",
            [a, b, 3.2],
            [3, 2.4, 0.15],
            tint(Math.round(angle * 3)),
            true,
            [0, angle, 0],
          ),
        );
      for (const [a, b] of around(5, 7)) {
        put("post", [a, b, 0.6], [1.2, 1.2, 1.2], "#f4f8ff");
        lit(put("ball", [a, b, 1.8], [0.9, 0.9, 0.9], "#ff3df2", true));
      }
      return inside;
    case "museum": {
      const plinths = around(6, 9);
      for (const [a, b] of plinths)
        put("post", [a, b, 0.6], [2, 1.2, 2], "#e8dcc3");
      const [first = [0, 0], pizza = [0, 0], bronze = [0, 0]] = plinths;
      lit(
        put("box", [first[0], first[1], 2], [1.6, 1.6, 1.6], "#e0b341", true),
      );
      put("disc", [pizza[0], pizza[1], 1.25], [1.8, 1, 1.8], "#ff8a5b");
      put("ball", [bronze[0], bronze[1], 1.8], [1.4, 1.4, 1.4], "#b0603e");
      put("box", [0, -16, 4], [14, 5, 0.3], "#5d6470");
      return inside;
    }
    case "library":
      for (const [a, b, angle] of around(18, 15, 0.7, Math.PI * 2 - 0.7)) {
        put("box", [a, b, 1.6], [2.6, 3.2, 0.7], "#8a5a3a", false, [
          0,
          angle,
          0,
        ]);
        for (let shelf = 0; shelf < 3; shelf += 1)
          put(
            "box",
            [a * 0.97, b * 0.97, 0.6 + shelf],
            [2.2, 0.6, 0.4],
            tint(shelf + Math.round(angle * 5)),
            false,
            [0, angle, 0],
          );
      }
      for (const [a, b] of around(4, 6))
        put("disc", [a, b, 0.8], [2.4, 1, 2.4], "#c9a46a");
      lit(put("pill", [0, 0, 1.1], [1.2, 1.2, 0.8], "#fff1b8", true));
      return inside;
    case "bank":
      for (const [a, b, angle] of around(7, 8, Math.PI * 0.6, Math.PI * 1.4))
        put("pill", [a, b, 0.6], [3.2, 1.2, 1], "#e8dcc3", false, [
          0,
          angle + Math.PI / 2,
          0,
        ]);
      lit(put("ring", [0, -16.8, 3], [6, 6, 6], "#e0b341", true));
      put("post", [0, -17, 3], [5, 0.6, 5], "#9aa3b5", false, [
        Math.PI / 2,
        0,
        0,
      ]);
      for (let k = 0; k < 6; k += 1)
        put("box", [-2.5 + k, -14, 0.2], [0.8, 0.35, 0.4], "#e0b341", true);
      return inside;
    case "records":
      put("pill", [0, -12, 1.6], [3.2, 3.2, 3.2], "#9fd8ff", false, [
        0,
        0,
        Math.PI / 2,
      ]);
      put("pill", [0, -6, 0.9], [5, 0.9, 1.6], "#2a2f45");
      for (let k = 0; k < 7; k += 1)
        lit(
          put("disc", [-9 + k * 3, -17.6, 3.2], [2.4, 1, 2.4], tint(k), true, [
            Math.PI / 2,
            0,
            0,
          ]),
        );
      return inside;
    case "studio":
      for (const a of [-5, 5]) {
        put("post", [a, -6, 1.2], [0.15, 2.4, 0.15], "#11131c");
        lit(put("ring", [a, -6, 2.6], [2, 2, 2], "#f4f8ff", true));
      }
      put("pill", [0, -10, 0.5], [5, 1, 1.4], "#ff8a5b");
      put("box", [0, 2, 1.4], [1, 0.8, 1.4], "#11131c");
      lit(put("pill", [0, -16, 5], [5, 1.4, 0.3], "#ff3b3b", true));
      return inside;
    case "skate":
      put("ring", [0, 0, 0.35], [14, 14, 14], "#9aa3b5", false, [
        Math.PI / 2,
        0,
        0,
      ]);
      put("disc", [0, 0, 0.05], [13, 1, 13], "#8a90a3");
      for (const b of [-14, 14])
        put("post", [0, b, 0.9], [3.6, 26, 3.6], "#9aa3b5", false, [
          0,
          0,
          Math.PI / 2,
        ]);
      for (const a of [-12, 12])
        put("pill", [a, 0, 0.7], [10, 0.12, 0.12], "#e0b341", false, [
          0,
          Math.PI / 2,
          0,
        ]);
      return inside;
    case "park":
      put("disc", [0, 0, 0.06], [40, 1, 40], "#4f9d5d");
      put("disc", [6, 6, 0.08], [9, 1, 7], "#5ba8d8", true);
      for (const [a, b] of around(9, 14)) {
        put("post", [a, b, 1.6], [0.4, 3.2, 0.4], "#8a6a4a");
        put("ball", [a, b, 4.2], [3.2, 3, 3.2], "#3fae6b");
      }
      return inside;
  }
}

// Whether a landmark is open to the sky (no round hall).
export const openAir = (venue: Venue): boolean => venue.door === null;
