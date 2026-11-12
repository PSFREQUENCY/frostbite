import { startState, stepInt } from "@frostbite/game-sdk/seeded";

// A coin the seed tosses: the same for every player of a seed, and a different coin for each `salt`. The seed is mixed first, so seeds
// that are near each other do not agree.
export function coin(seed: number, salt = 0): boolean {
  const from = seed ^ salt;
  let mixed = Math.imul(from ^ (from >>> 16), 0x85_eb_ca_6b);
  mixed = Math.imul(mixed ^ (mixed >>> 13), 0xc2_b2_ae_35);
  return stepInt(startState(mixed ^ (mixed >>> 16)), 2).value === 1;
}
