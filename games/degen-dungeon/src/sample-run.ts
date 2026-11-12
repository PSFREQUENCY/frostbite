import type { RunInput, RunRecord } from "@frostbite/game-sdk/run-record";

import { gameId, verifierId, verifierVersion } from "./rules/constants.ts";

// One legal day the verifier is shown with: Rally wakes in The Exchange, takes his first DUN from the Faucet, carries a parcel from the
// courier desk to the yacht club and walks home. It is a plain record, not one built with the SDK's recorder, so the published verifier
// carries only the rules. A pair is a heading and the tick it was taken on; a number alone is the tick of an act.
const steps: readonly (number | readonly [number, number])[] = [
  [4, 0],
  [-1, 193],
  [8, 193],
  [-1, 270],
  270,
  [0, 270],
  [-1, 347],
  [0, 347],
  [-1, 463],
  463,
  [8, 463],
  [-1, 579],
  [12, 579],
  [-1, 1503],
  [4, 1503],
  [-1, 1811],
  1811,
  [12, 1811],
  [-1, 2119],
  [4, 2119],
  [-1, 3043],
  [12, 3043],
  [-1, 3236],
  3236,
];

export function sampleRun(): RunRecord {
  return {
    claims: ["faucet", "first-gig", "home-safe"],
    config: { day: 1, hero: 7 },
    gameId,
    inputs: steps.map((step): RunInput =>
      typeof step === "number"
        ? { data: { tick: step }, type: "act" }
        : { data: { dir: step[0], tick: step[1] }, type: "move" },
    ),
    schemaVersion: 1,
    seed: 20_261_111,
    verifier: verifierId,
    verifierVersion,
  };
}
