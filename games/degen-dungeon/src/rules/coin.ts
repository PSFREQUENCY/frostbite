import { startState, stepInt } from "@frostbite/game-sdk/seeded";

// A coin the seed tosses: the same for every player of a seed, and a different coin for each `salt`. The seed is mixed first, so seeds
// that are near each other do not agree.
export const coin = (seed: number, salt = 0): boolean =>
  roll(seed, salt, 2) === 1;

// A die of so many sides the seed throws, mixed the same way: a whole number from 0 up to one less than `sides`.
export function roll(seed: number, salt: number, sides: number): number {
  const from = seed ^ salt;
  let mixed = Math.imul(from ^ (from >>> 16), 0x85_eb_ca_6b);
  mixed = Math.imul(mixed ^ (mixed >>> 13), 0xc2_b2_ae_35);
  return stepInt(startState(mixed ^ (mixed >>> 16)), sides).value;
}

// A number of a name's own (a machine's, a window's), so each has its own luck on the same day.
export const saltOf = (id: string): number =>
  [...id].reduce((sum, letter, at) => sum + letter.charCodeAt(0) * (at + 7), 0);
