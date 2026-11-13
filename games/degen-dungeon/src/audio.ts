import {
  commonEffects,
  tone,
  type Effect,
} from "@frostbite/game-sdk/audio/effects";
import type { Track } from "@frostbite/game-sdk/audio/tracks";

// The game's sound, as data: a loop for the night city, a chime for a catch and a thud for a miss. Nothing here is a file: the SDK plays it
// with the browser's audio.
const rest = (count: number): null[] =>
  Array.from({ length: count }, () => null);

// Sixteen steps of a night-city groove in A minor: a walking bass, a pad that holds each chord, a bright arpeggio over it, and a hat on
// the off-beats.
const bass = [
  45,
  null,
  45,
  52,
  48,
  null,
  48,
  55,
  43,
  null,
  43,
  50,
  47,
  null,
  52,
  50,
];
const pad = [57, ...rest(3), 60, ...rest(3), 55, ...rest(3), 59, ...rest(3)];
const arp = [69, 72, 76, 72, 72, 76, 79, 76, 67, 71, 74, 71, 71, 74, 79, 74];
const hat = Array.from({ length: 16 }, (_, step) =>
  step % 2 === 1 ? 96 : null,
);

export const track: Track = {
  name: "degen-dungeon",
  tempo: 112,
  voices: [
    { gain: 0.2, hold: 0.9, notes: bass, wave: "triangle" },
    { gain: 0.06, hold: 3.8, notes: pad, wave: "sine" },
    { gain: 0.045, hold: 0.45, notes: arp, wave: "square" },
    { gain: 0.02, hold: 0.08, notes: hat, wave: "square" },
  ],
};

export const effects = {
  catch: [tone("square", 660, 880, 0.12, 0.3)],
  miss: [tone("sawtooth", 220, 80, 0.4, 0.4), tone("noise", 0, 0, 0.25, 0.2)],
  milestone: commonEffects.win,
  start: commonEffects.start,
} as const satisfies Record<string, Effect>;

export type EffectName = keyof typeof effects;
