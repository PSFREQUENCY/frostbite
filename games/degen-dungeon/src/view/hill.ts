import { halfLong, halfWide, letters, peak } from "../rules/mountain.ts";
import { podiumAt } from "./dex.ts";

// The lie of Mount WAGMI's land (`rules/mountain.ts` keeps where it can be walked, and has no heights): from the end of The Old Floe's
// middle street the ground rises to a ridge just behind the sign, where the letters stand on a flat terrace, and past the ridge it falls
// steeply to the sea; round its edge it slopes under the water (`landAt`). `hillAt` is the ground under a point (metres), for the hero,
// the crew, the camera and everything built on the hill: the hill where it stands out of the sea, and nothing anywhere else.
export const cx = peak.x / 100;
export const cz = peak.z / 100;
const ax = halfWide / 100;
export const az = halfLong / 100;
export const foot = 360.5;
const ridge = 468;
export const tallest = 34;
export const smooth = (part: number): number => {
  const t = Math.min(1, Math.max(0, part));
  return t * t * (3 - 2 * t);
};
const rise = (x: number): number => {
  if (x <= foot) return 0;
  if (x <= ridge) {
    const part = (x - foot) / (ridge - foot);
    return 0.5 * part + 0.5 * smooth(part);
  }
  return 1 - smooth((x - ridge) / (cx + ax - ridge));
};
const across = (x: number, z: number): number => {
  const wide = az * Math.sqrt(Math.max(0, 1 - ((x - cx) / ax) ** 2));
  return wide <= 0 ? 0 : smooth((1 - Math.abs(z - cz) / wide) / 0.5);
};
const natural = (x: number, z: number): number =>
  tallest * rise(x) * across(x, z);
// The terrace in front of and under the sign, flat, blended into the slope round it.
const first = letters[0]?.z0 ?? 4_000;
const last = letters.at(-1)?.z1 ?? 8_000;
export const pad = {
  x0: 453,
  x1: 470,
  z0: first / 100 - 4,
  z1: last / 100 + 4,
};
export const terrace = natural(461, cz);

const outOf = (x: number, z: number): number =>
  Math.hypot((x - cx) / ax, (z - cz) / az);
// The hill's surface, which slopes under the sea round its edge (for drawing it).
export function landAt(x: number, z: number): number {
  const shore = -2.6 * smooth((outOf(x, z) - 0.97) / 0.15);
  const flat = smooth(
    Math.hypot(
      Math.max(pad.x0 - x, 0, x - pad.x1),
      Math.max(pad.z0 - z, 0, z - pad.z1),
    ) / 6,
  );
  return shore + terrace + (natural(x, z) - terrace) * flat;
}
// The ground under a point anyone can stand on: the hill's surface on Mount WAGMI, the Global DEX's steps and podium (`dex.ts`), and
// the street (or the sea) everywhere else.
// Underground (`rules/caves.ts`), the floor goes down a metre every twenty, east from the caves' mouth, to the bazaar eight metres down.
export const caveFloor = (x: number): number =>
  -Math.min(8, Math.max(0, (x - 1_200) / 20));
export const hillAt = (x: number, z: number): number =>
  x >= 1_200 && x <= 1_420
    ? caveFloor(x)
    : (podiumAt(x, z) ?? (x <= foot || outOf(x, z) >= 1 ? 0 : landAt(x, z)));
