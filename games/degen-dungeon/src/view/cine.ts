import type { Pose, Vec } from "./camera.ts";

// A cinematic is a list of shots, each a camera move from one pose to another with a line of words under it. The page plays one by the
// clock and can stop it at any moment, so every cinematic can be skipped. The opening is the first; a hero's wake-up, a train ride or the
// drain morning is another list like it.
export interface Shot {
  readonly caption: string;
  readonly from: readonly [Vec, Vec];
  readonly look: readonly [Vec, Vec];
  readonly seconds: number;
}

export interface Frame {
  readonly caption: string;
  // Which shot this is, and how far through it (0 to 1).
  readonly index: number;
  readonly part: number;
  readonly pose: Pose;
}

const along = ([from, to]: readonly [Vec, Vec], part: number): Vec => [
  from[0] + (to[0] - from[0]) * part,
  from[1] + (to[1] - from[1]) * part,
  from[2] + (to[2] - from[2]) * part,
];

// The frame a cinematic is on after `seconds`, or null once it is over.
export function frameOf(shots: readonly Shot[], seconds: number): Frame | null {
  let start = 0;
  for (const [index, shot] of shots.entries()) {
    if (seconds < start + shot.seconds) {
      const part = Math.max(0, seconds - start) / shot.seconds;
      return {
        caption: shot.caption,
        index,
        part,
        pose: {
          fov: 45,
          from: along(shot.from, part),
          look: along(shot.look, part),
        },
      };
    }
    start += shot.seconds;
  }
  return null;
}

// The opening: one block of ice in the dark, the island growing round it, night over the signs, nine windows, and the name of the place.
// Places are in metres; The Exchange is at 180, 180 and the Faucet, where the first block was laid, just west of it.
export const opening: readonly Shot[] = [
  {
    caption: "Someone laid one block of ice and walked away.",
    from: [
      [172, 1.2, 186],
      [171, 1.6, 184],
    ],
    look: [
      [170, 0.5, 180],
      [170, 0.5, 180],
    ],
    seconds: 6,
  },
  {
    caption: "A city grew up around it.",
    from: [
      [180, 40, 330],
      [180, 120, 420],
    ],
    look: [
      [180, 0, 180],
      [180, 0, 180],
    ],
    seconds: 7,
  },
  {
    caption: "Every sign promised a beach that no train reaches.",
    from: [
      [60, 25, 300],
      [300, 25, 300],
    ],
    look: [
      [180, 20, 180],
      [180, 20, 180],
    ],
    seconds: 7,
  },
  {
    caption: "Nine newbies woke up to nine different problems.",
    from: [
      [180, 260, 181],
      [180, 180, 181],
    ],
    look: [
      [180, 0, 180],
      [180, 0, 180],
    ],
    seconds: 6,
  },
  {
    caption: "Welcome to Nakasato.",
    from: [
      [180, 30, 260],
      [180, 34, 250],
    ],
    look: [
      [180, 40, 180],
      [180, 40, 180],
    ],
    seconds: 4,
  },
];
