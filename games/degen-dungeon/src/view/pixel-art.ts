import { hash } from "./hash.ts";

// The Pixel Vault Gallery's pieces, painted in code, sixteen pixels square, every one original: a critter the same on both sides with two
// bright eyes, a sunset over a gridded sea, a coin stamped D for DUN, and a glitch of broken stripes. Which colours each takes comes from
// its number, so the same piece is painted the same way every time.
export type Rgb = readonly [number, number, number];
export type Dot = (x: number, y: number, colour: Rgb) => void;

const size = 16;
const bytes = (hex: string): Rgb => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];
const palette = [
  "#ff3df2",
  "#5beac6",
  "#ffd166",
  "#6aa8ff",
  "#ff8a5b",
  "#7be36b",
] as const;
const mix = (a: Rgb, b: Rgb, t: number): Rgb => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
];
const ink: Rgb = [20, 10, 40];
const white: Rgb = [255, 255, 255];
const sun: Rgb = [255, 214, 102];
// The D on the coin, five across and seven down.
const letter = ["11110", "10001", "10001", "10001", "10001", "10001", "11110"];

export const styles = ["critter", "sunset", "coin", "glitch"] as const;
export const styleOf = (index: number): (typeof styles)[number] =>
  styles[index % styles.length] ?? "critter";

export function paint(dot: Dot, index: number): void {
  const choose = (k: number): Rgb =>
    bytes(
      palette[Math.floor(hash(index, k, 21) * palette.length)] ?? "#ff3df2",
    );
  const a = choose(1);
  const b = choose(2);
  // A night-purple ground, lighter toward the bottom.
  for (let y = 0; y < size; y += 1)
    for (let x = 0; x < size; x += 1)
      dot(x, y, [18 + y * 2, 10 + y, 42 + y * 3]);
  switch (styleOf(index)) {
    case "critter":
      for (let y = 3; y < 13; y += 1)
        for (let x = 0; x < 6; x += 1)
          if (hash(index * 31 + x, y, 22) < 0.55) {
            dot(2 + x, y, a);
            dot(13 - x, y, a);
          }
      for (const x of [5, 10]) {
        dot(x, 6, white);
        dot(x, 7, ink);
      }
      return;
    case "sunset":
      for (let y = 0; y < 9; y += 1)
        for (let x = 0; x < size; x += 1) dot(x, y, mix(a, b, y / 8));
      for (let y = 2; y < 9; y += 1)
        for (let x = 0; x < size; x += 1)
          if ((x - 7.5) ** 2 + (y - 8) ** 2 < 25 && !(y > 5 && y % 2 === 0))
            dot(x, y, sun);
      for (let y = 9; y < size; y += 1)
        for (let x = 0; x < size; x += 1)
          dot(x, y, y === 9 || (x + y * 3) % 4 === 0 ? b : ink);
      return;
    case "coin":
      for (let y = 0; y < size; y += 1)
        for (let x = 0; x < size; x += 1) {
          const out = Math.hypot(x - 7.5, y - 7.5);
          if (out < 6.6) dot(x, y, out > 5.5 ? [184, 132, 24] : sun);
        }
      letter.forEach((row, y) =>
        [...row].forEach((on, x) => {
          if (on === "1") dot(5 + x, 4 + y, [122, 72, 12]);
        }),
      );
      return;
    case "glitch":
      for (let y = 0; y < size; y += 1) {
        const shift = Math.floor(hash(index, y, 23) * 5) - 2;
        const colour = y % 3 === 0 ? a : y % 3 === 1 ? b : white;
        for (let x = 0; x < size; x += 1)
          if (hash(x, y, index + 24) < 0.72)
            dot((x + shift + size) % size, y, colour);
      }
      return;
  }
}
