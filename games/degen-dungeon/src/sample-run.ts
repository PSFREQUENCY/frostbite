import type { RunInput, RunRecord } from "@frostbite/game-sdk/run-record";

import { gameId, verifierId, verifierVersion } from "./rules/constants.ts";

// One legal day the verifier is shown with, two of the first morning's three quests and a little more: Rally wakes in his loft in The
// Exchange, walks out into the FREE FROST riot, hears Frost's speech on the steps of the Global DEX, takes his first DUN from the Faucet
// and writes his seed paper (into the freezer), carries a parcel from the courier desk to the yacht club, pays the landlord the rent and
// goes home to bed. Its one milestone is the seed paper's:
// the speech is a quest without one. It is a plain record, not one built with the SDK's recorder, so the published verifier carries only
// the rules. A pair is a heading and the tick it was taken on, a number alone is the tick of an act, and a triple is an answer.
type Step =
  | number
  | readonly [dir: number, tick: number]
  | readonly ["pick", choice: number, tick: number];
const steps: readonly Step[] = [
  [4, 0],
  [-1, 100],
  [0, 100],
  [-1, 296],
  [4, 296],
  [-1, 350],
  [4, 350],
  [-1, 416],
  [8, 416],
  [-1, 709],
  709,
  ["pick", 0, 709],
  ["pick", 0, 709],
  ["pick", 0, 709],
  [0, 709],
  [-1, 1002],
  [12, 1002],
  [-1, 1069],
  [8, 1069],
  [-1, 1147],
  1147,
  ["pick", 3, 1147],
  [0, 1147],
  [-1, 1225],
  [0, 1225],
  [-1, 1340],
  1340,
  [8, 1340],
  [-1, 1456],
  [12, 1456],
  [-1, 2379],
  [4, 2379],
  [-1, 2688],
  2688,
  [12, 2688],
  [-1, 2997],
  [4, 2997],
  [-1, 3921],
  [12, 3921],
  [-1, 3975],
  [8, 3975],
  [-1, 4106],
  4106,
  ["pick", 0, 4106],
  [0, 4106],
  [-1, 4238],
  [4, 4238],
  [-1, 4292],
  [8, 4292],
  [-1, 4488],
  [12, 4488],
  [-1, 4642],
  4642,
  ["pick", 0, 4642],
];

const inputOf = (step: Step): RunInput => {
  if (typeof step === "number") return { data: { tick: step }, type: "act" };
  if (step[0] === "pick")
    return { data: { choice: step[1], tick: step[2] }, type: "pick" };
  return { data: { dir: step[0], tick: step[1] }, type: "move" };
};

export function sampleRun(): RunRecord {
  return {
    claims: ["seed-paper"],
    config: { day: 1, hero: 7 },
    gameId,
    inputs: steps.map(inputOf),
    schemaVersion: 1,
    seed: 20_261_111,
    verifier: verifierId,
    verifierVersion,
  };
}
