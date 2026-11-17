import { roofLevel, storeys } from "../rules/climb.ts";
import { letterAt, onLetterTop, signFace } from "../rules/mountain.ts";
import type { DayState } from "../rules/types.ts";
import { onLand, wallBeside } from "../rules/world.ts";
import { turnTo } from "./camera.ts";
import { hillAt } from "./hill.ts";
import { roofAt } from "./lots.ts";
import { climbAcross, seatHeight } from "./letters.ts";

// How going up looks. A climber's height eases toward the storey the rules put them on at a climber's pace: the wall in front of them is
// split into its storeys up to just under its roof (`roofAt`, or `storey` metres a storey where there is none), and on the roof they walk
// at the height of the roof under their feet. A helicopter is shown at its level (`levelHeight` metres a level) at once. On a wall the
// hero turns to face it and closes in until hands and feet are on it; while the height is still changing they climb, and once it holds
// they hang there. A WAGMI letter climbs the same way up to its top, where the hero sits facing the city (`wagmi.ts` says how high
// each seat is); going up and down a letter the body glides between the places the rules give. Everything stands on the ground under it
// (`hill.ts`): the street, or Mount WAGMI's slope.
export const storey = 2.8;
export const levelHeight = 12;
const climbPace = 1.6;
// How close to the wall the body comes (metres from its middle), and how high it has climbed by the time it is up against it.
const hugGap = 0.42;
const hugBy = 0.6;

export type Hold = "climbing" | "hanging" | "sitting";
export interface Shown {
  // The ground under them (metres).
  readonly ground: number;
  readonly heading: number;
  // What the hero is doing on a wall, or null off one.
  readonly hold: Hold | null;
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface Climber {
  // The hero's place and heading as shown (metres and radians), for the place and heading the rules give, a frame's time later.
  follow(
    state: Pick<DayState, "level" | "ride" | "x" | "z">,
    x: number,
    z: number,
    heading: number,
    dt: number,
  ): Shown;
}

export function createClimber(): Climber {
  let shown = 0;
  let last: Shown | null = null;
  // Up and down a letter the body glides to where the rules put it, turning as it goes; anywhere else it is simply there.
  const glide = (to: Shown, dt: number, letter: boolean): Shown => {
    const was = last;
    last = to;
    if (!letter || was === null || Math.hypot(to.x - was.x, to.z - was.z) > 6)
      return to;
    const dx = to.x - was.x;
    const dz = to.z - was.z;
    const part = Math.min(1, (2.5 * dt) / Math.max(1e-6, Math.hypot(dx, dz)));
    const turn = turnTo(was.heading, to.heading);
    last = {
      ...to,
      heading: was.heading + Math.max(-5 * dt, Math.min(5 * dt, turn)),
      x: was.x + dx * part,
      z: was.z + dz * part,
    };
    return last;
  };
  return {
    follow(state, x, z, heading, dt) {
      const foot = state.ride === "foot";
      const ground = hillAt(x, z);
      const letter =
        foot && state.level <= storeys && letterAt(state.x, state.z) >= 0;
      if (foot && state.level === roofLevel && onLetterTop(state.x, state.z)) {
        // Up on a letter: onto its top at a climber's pace, then sitting there, looking out over the city.
        const step = climbPace * dt * 2;
        shown += Math.max(-step, Math.min(step, seatHeight(state.z) - shown));
        const y = ground + shown;
        return glide(
          { ground, heading: Math.PI, hold: "sitting", x, y, z },
          dt,
          true,
        );
      }
      const wall = !foot
        ? null
        : letter
          ? { east: 1, gap: signFace - state.x, south: 0 }
          : wallBeside(state.x, state.z);
      const top = letter
        ? seatHeight(state.z)
        : wall === null
          ? null
          : roofAt(
              (state.x + wall.east * (wall.gap + 150)) / 100,
              (state.z + wall.south * (wall.gap + 150)) / 100,
            );
      const target = !foot
        ? state.level * levelHeight
        : state.level === roofLevel
          ? (roofAt(x, z) ?? storeys * storey)
          : state.level *
            (top === null ? storey : Math.max(1, top - 0.8) / storeys);
      if (foot && state.level === roofLevel) {
        // On a roof: up to it at a climber's pace, then along at its height.
        const step = climbPace * dt * (shown < target - 1 ? 1 : 4);
        shown += Math.max(-step, Math.min(step, target - shown));
        return glide(
          { ground, heading, hold: null, x, y: shown, z },
          dt,
          false,
        );
      }
      // Flying, or put somewhere else at once (the story moved them), a body is simply there.
      if (wall === null) shown = target;
      const step = climbPace * dt;
      const was = shown;
      shown += Math.max(-step, Math.min(step, target - shown));
      const y = ground + shown;
      if (wall === null || shown <= 0)
        return glide({ ground, heading, hold: null, x, y, z }, dt, letter);
      const reach = (wall.gap / 100 - hugGap) * Math.min(1, shown / hugBy);
      // Up a letter, the body keeps to the stroke it climbs.
      const across =
        letter && state.level > 0 ? climbAcross(state.z, shown + 0.9) : z;
      return glide(
        {
          ground,
          heading: Math.atan2(wall.south, wall.east),
          hold: shown !== was || shown !== target ? "climbing" : "hanging",
          x: x + wall.east * reach,
          y,
          z: across + wall.south * reach,
        },
        dt,
        letter,
      );
    },
  };
}

// Whether a ground point (metres) is inside a building for a camera following someone at a height: on the island, off its streets and
// landmarks (the rules' own map), and under a roof that is not lower than them.
export const buildingAt =
  (height: () => number) =>
  (x: number, z: number): boolean =>
    x > 0 &&
    z > 0 &&
    x < 360 &&
    z < 360 &&
    !onLand(x * 100, z * 100) &&
    (roofAt(x, z) ?? Infinity) > height() + 0.5;
