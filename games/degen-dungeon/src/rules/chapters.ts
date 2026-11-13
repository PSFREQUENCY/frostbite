import type { Point } from "./types.ts";
import { slotOf } from "./world.ts";

// Each hero's story, beat by beat, after the first morning: days two to four have three beats each, and the last day opens on the hero's
// dream. A beat is done by acting at its place once its need is met; a beat with a pick asks for one of two answers, and each answer has
// its own gift. The words for every beat are in `script/stories.ts`, in the same order. The numbers are a draft for the owner.
export interface Gift {
  readonly drain?: true;
  // DUN into the pocket (or out of it, below zero), and story DUN is never counted as DUN made.
  readonly dun?: number;
  readonly fomo?: number;
  readonly heat?: number;
  readonly rep?: number;
  readonly rug?: true;
  readonly spot?: true;
  readonly warn?: true;
}
export interface Need {
  readonly cool?: true;
  // Someone from this list is in the crew.
  readonly crew?: readonly number[];
  readonly crewSize?: number;
  readonly gigs?: number;
  readonly pay?: number;
  readonly rides?: number;
  readonly traded?: true;
  readonly vision?: true;
}
export interface Beat {
  readonly at: Point;
  readonly gift?: Gift;
  readonly need?: Need;
  readonly pick?: readonly [Gift, Gift];
}

const b = (borough: number, lane: number, need?: Need, gift?: Gift): Beat => ({
  at: slotOf(borough, lane),
  ...(gift === undefined ? {} : { gift }),
  ...(need === undefined ? {} : { need }),
});
const pick = (
  borough: number,
  lane: number,
  first: Gift,
  second: Gift,
  need?: Need,
): Beat => ({
  at: slotOf(borough, lane),
  pick: [first, second],
  ...(need === undefined ? {} : { need }),
});
const pier: Point = { x: 16_800, z: 200 };
const seen: Need = { vision: true };

// By hero, then by day from two to four.
export const chapters: readonly (readonly (readonly Beat[])[])[] = [
  [
    [
      b(3, 0, {}, { dun: 150 }),
      b(3, 1, {}, { dun: 150 }),
      b(3, 2, { pay: 100 }, { dun: 500 }),
    ],
    [b(3, 3, { crew: [2, 5] }), b(7, 0, seen), b(3, 0, {}, { rep: 20 })],
    [
      b(7, 1),
      pick(7, 2, { rep: 50 }, { dun: 1_000 }),
      b(3, 1, {}, { dun: 500 }),
    ],
  ],
  [
    [b(5, 0, {}, { fomo: 20 }), b(5, 1, seen), b(5, 2, {}, { dun: 400 })],
    [
      b(5, 3, { crew: [2, 8] }),
      b(5, 0, seen, { rep: 20 }),
      b(4, 0, {}, { fomo: -30, rep: 10 }),
    ],
    [
      b(5, 1),
      b(5, 2, { pay: 1_000 }, { rep: 30 }),
      b(7, 3, {}, { dun: 1_500 }),
    ],
  ],
  [
    [b(7, 0, {}, { dun: 250 }), b(7, 1, seen), b(7, 2, seen, { rep: 10 })],
    [
      b(7, 3, { crew: [1, 0, 5] }),
      b(5, 0, { rides: 2 }),
      b(7, 0, seen, { rep: 20 }),
    ],
    [
      pick(7, 1, { dun: -500, rug: true }, { spot: true }),
      pick(5, 2, { drain: true }, { spot: true }),
      b(7, 2, seen, { rep: 30 }),
    ],
  ],
  [
    [
      b(2, 0, {}, { dun: 100 }),
      b(3, 3, {}, { dun: 100 }),
      b(2, 1, {}, { dun: 300, rep: 10 }),
    ],
    [
      b(2, 2, { crew: [4, 7, 8] }),
      b(2, 3, {}, { dun: 600 }),
      b(2, 0, seen, { fomo: 10 }),
    ],
    [
      b(2, 1, { pay: 2_000 }),
      pick(2, 2, { rep: 40 }, { dun: 1_000, heat: 100 }),
      b(2, 3, {}, { rep: 20 }),
    ],
  ],
  [
    [b(6, 0), b(6, 1, {}, { dun: 200 }), b(6, 2, { pay: 300 }, { rep: 30 })],
    [
      b(6, 3, { crew: [5, 3] }),
      b(6, 0, {}, { rep: 20 }),
      b(6, 1, { pay: 500 }, { rep: 30 }),
    ],
    [
      b(6, 2),
      pick(4, 0, { rep: 60, warn: true }, { dun: 2_000, rep: -40 }),
      b(4, 3),
    ],
  ],
  [
    [
      b(8, 0, { gigs: 2 }, { dun: 200 }),
      b(5, 2, {}, { dun: 100, fomo: 10 }),
      pick(6, 0, { dun: 600, rep: -20 }, { rep: 30 }),
    ],
    [
      b(8, 1, { crew: [4, 8] }),
      b(6, 1, {}, { rep: 10 }),
      b(6, 2, seen, { rep: 20 }),
    ],
    [
      b(8, 0),
      b(8, 2, { crewSize: 1 }, { dun: 500 }),
      b(4, 0, { pay: 500 }, { rep: 50 }),
    ],
  ],
  [
    [
      b(1, 0, {}, { dun: 200 }),
      b(1, 1, seen, { rep: 10 }),
      b(1, 2, {}, { rep: 30 }),
    ],
    [b(1, 3, { crew: [3, 5, 7] }), b(1, 1, seen), b(0, 0, {}, { rep: 10 })],
    [
      b(1, 2, seen),
      b(1, 3, {}, { heat: 200 }),
      b(0, 1, { cool: true }, { dun: 2_000 }),
    ],
  ],
  [
    [
      b(6, 2, {}, { dun: 300 }),
      b(1, 3, {}, { dun: 200, fomo: 20 }),
      b(4, 0, { traded: true }),
    ],
    [b(4, 1, { crew: [8, 5] }), b(2, 0, {}, { rep: 20 }), b(4, 0, seen)],
    [
      b(4, 2, seen, { heat: 60 }),
      b(4, 3, { pay: 1_000 }),
      b(4, 0, {}, { dun: 3_000 }),
    ],
  ],
  [
    [
      { at: pier, gift: { dun: 150 } },
      b(1, 0, {}, { dun: 250, rep: 10 }),
      b(4, 2, {}, { rep: 5 }),
    ],
    [
      b(0, 0, { crew: [6, 0, 4] }),
      b(4, 3, seen, { heat: 100 }),
      b(4, 2, {}, { rep: 20 }),
    ],
    [
      b(4, 2, seen),
      pick(4, 1, { rep: 100, warn: true }, { dun: 4_000 }),
      b(0, 1, {}, { heat: -100 }),
    ],
  ],
  [
    [b(5, 0), b(5, 1, {}, { dun: 200 }), b(5, 2, { pay: 500 }, { rep: 20 })],
    [
      b(5, 3, { crew: [8, 5, 3] }),
      b(5, 0, seen, { rep: 20 }),
      b(5, 1, {}, { dun: 500 }),
    ],
    [
      pick(4, 2, { dun: 5_000, rep: -50 }, { rep: 20 }),
      b(5, 2, seen, { warn: true }),
      b(5, 3, {}, { rep: 40 }),
    ],
  ],
];

// The dream that opens each hero's last day: two endings to choose between.
export const dreams: readonly Beat[] = [
  pick(3, 2, { rep: 100 }, { dun: 2_000 }),
  pick(5, 3, { dun: 2_000 }, { rep: 100 }),
  pick(7, 3, { rep: 100 }, { dun: 1_000 }),
  pick(2, 0, { rep: 100 }, { dun: 1_000 }),
  pick(4, 2, { rep: 100 }, { dun: 500, rep: 60 }),
  pick(8, 3, { dun: 1_000 }, { rep: 100 }),
  pick(1, 0, { dun: 1_000 }, { rep: 100 }),
  pick(4, 1, { dun: 2_000 }, { rep: 100 }),
  pick(0, 2, { dun: 2_000 }, { rep: 100 }),
  pick(5, 0, { rep: 100 }, { dun: 2_000 }),
];

// Moon Night for everyone after the dream: the party under Moon Tower, then the last door, which needs the crew's three words.
export const party: Beat = { at: { x: 18_000, z: 16_800 }, gift: { fomo: 10 } };
export const genesis: Beat = {
  at: { x: 18_000, z: 19_500 },
  need: { crewSize: 2 },
};
