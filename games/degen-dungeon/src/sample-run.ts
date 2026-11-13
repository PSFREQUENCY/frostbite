import type { RunInput, RunRecord } from "@frostbite/game-sdk/run-record";

import { gameId, verifierId, verifierVersion } from "./rules/constants.ts";

// One legal day the verifier is shown with: Rally wakes in The Exchange, inside the FREE FROST riot, hears Frost's speech, takes his first
// DUN from the Faucet and writes his seed paper (into the freezer), carries a parcel from the courier desk to the yacht club, and walks
// home to sleep. It is a plain record, not one built with the SDK's recorder, so the published verifier carries only the rules. A pair
// is a heading and the tick it was taken on, a number alone is the tick of an act, and a triple is an answer.
type Step =
  | number
  | readonly [dir: number, tick: number]
  | readonly ["pick", choice: number, tick: number];
const steps: readonly Step[] = [
  [4, 0],
  [-1, 193],
  [4, 193],
  [-1, 308],
  308,
  ["pick", 0, 308],
  ["pick", 0, 308],
  ["pick", 0, 308],
  [12, 308],
  [-1, 424],
  [8, 424],
  [-1, 501],
  501,
  ["pick", 3, 501],
  [0, 501],
  [-1, 578],
  [0, 578],
  [-1, 694],
  694,
  [8, 694],
  [-1, 810],
  [12, 810],
  [-1, 1733],
  [4, 1733],
  [-1, 2041],
  2041,
  [12, 2041],
  [-1, 2349],
  [4, 2349],
  [-1, 3273],
  [12, 3273],
  [-1, 3466],
  3466,
  ["pick", 0, 3466],
];

const inputOf = (step: Step): RunInput => {
  if (typeof step === "number") return { data: { tick: step }, type: "act" };
  if (step[0] === "pick")
    return { data: { choice: step[1], tick: step[2] }, type: "pick" };
  return { data: { dir: step[0], tick: step[1] }, type: "move" };
};

export function sampleRun(): RunRecord {
  return {
    claims: ["faucet", "first-gig", "home-safe", "the-speech", "seed-paper"],
    config: { day: 1, hero: 7 },
    gameId,
    inputs: steps.map(inputOf),
    schemaVersion: 1,
    seed: 20_261_111,
    verifier: verifierId,
    verifierVersion,
  };
}
