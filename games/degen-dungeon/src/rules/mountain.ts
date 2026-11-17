import type { Point } from "./types.ts";

// Mount WAGMI, rising out of the sea east of The Old Floe: the Floe's middle street runs off the island's edge onto a hiking trail that
// switchbacks up its western slope to a terrace on the ridge, where the WAGMI letters stand facing the city, each ten metres tall (about
// six heroes) on a scaffold of wooden planks. The whole slope can be walked; the sign's footprint, letters and scaffold, cannot. Each
// letter climbs like a wall, from the terrace in front of it (`climb.ts`), and its top takes a sitter, who looks out over the whole
// city (the view gives them the lookout's camera). Only feet go up: no wheels on the trail.
export const peak: Point = { x: 43_300, z: 6_000 };
export const halfWide = 7_800;
export const halfLong = 6_400;
// The letters' front faces stand on this line, each this thick; the scaffold runs this far behind them.
export const signFace = 45_900;
export const signThick = 80;
export const scaffold = 700;
// Each letter is climbed and sat on at its seats (the tops of its strokes: a W's two outer strokes and its middle, an M's two).
export interface Letter {
  readonly char: string;
  readonly seats: readonly number[];
  readonly z0: number;
  readonly z1: number;
}
// From north to south, so they read left to right from the city.
export const letters: readonly Letter[] = [
  { char: "W", seats: [4_078, 4_450, 4_822], z0: 4_000, z1: 4_900 },
  { char: "A", seats: [5_400], z0: 5_050, z1: 5_750 },
  { char: "G", seats: [6_250], z0: 5_900, z1: 6_600 },
  { char: "M", seats: [6_838, 7_512], z0: 6_750, z1: 7_600 },
  { char: "I", seats: [7_875], z0: 7_750, z1: 8_000 },
];
const reachIn = 300;
const margin = 30;

// On the mountain's slopes (an ellipse round its peak), and not inside the sign.
export function onMountain(x: number, z: number): boolean {
  const east = ((x - peak.x) * 1_000) / halfWide;
  const south = ((z - peak.z) * 1_000) / halfLong;
  if (east * east + south * south >= 1_000_000) return false;
  const first = letters[0];
  const last = letters.at(-1);
  const inSign =
    first !== undefined &&
    last !== undefined &&
    x >= signFace &&
    x <= signFace + scaffold &&
    z >= first.z0 - margin &&
    z <= last.z1 + margin;
  return !inSign;
}

// The letter whose face a point on the terrace stands before (within a climber's reach), or -1.
export function letterAt(x: number, z: number): number {
  if (x < signFace - reachIn || x >= signFace) return -1;
  return letters.findIndex(
    (letter) => z >= letter.z0 - margin && z <= letter.z1 + margin,
  );
}
// Whether a point is up on a letter's top.
export const onLetterTop = (x: number, z: number): boolean =>
  x >= signFace &&
  x <= signFace + signThick &&
  letters.some((letter) => z >= letter.z0 - margin && z <= letter.z1 + margin);
// The seat of the letter in front of a climber nearest to them (where they go up), and where they come back down to.
export function seatNear(z: number): number {
  const letter = letters.find(
    (one) => z >= one.z0 - margin && z <= one.z1 + margin,
  );
  return (letter?.seats ?? []).reduce(
    (best, seat) => (Math.abs(seat - z) < Math.abs(best - z) ? seat : best),
    letter?.seats[0] ?? z,
  );
}
export const letterTop = (z: number): Point => ({
  x: signFace + signThick / 2,
  z: seatNear(z),
});
export const letterFoot = (z: number): Point => ({ x: signFace - 120, z });
