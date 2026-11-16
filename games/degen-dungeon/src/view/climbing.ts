import type { DayState } from "../rules/types.ts";
import { wallBeside } from "../rules/world.ts";

// How going up looks. A climber's height eases toward the storey the rules put them on (`storey` metres a storey) at a climber's pace;
// a helicopter is shown at its level (`levelHeight` metres a level) at once. On a wall the hero turns to face it and closes in until hands
// and feet are on it; while the height is still changing they climb, and once it holds they hang there.
export const storey = 2.8;
export const levelHeight = 12;
const climbPace = 1.6;
// How close to the wall the body comes (metres from its middle), and how high it has climbed by the time it is up against it.
const hugGap = 0.42;
const hugBy = 0.6;

export type Hold = "climbing" | "hanging";
export interface Shown {
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
  return {
    follow(state, x, z, heading, dt) {
      const foot = state.ride === "foot";
      const target = state.level * (foot ? storey : levelHeight);
      const wall = foot ? wallBeside(state.x, state.z) : null;
      // Flying, or put somewhere else at once (the story moved them), a body is simply there.
      if (wall === null) shown = target;
      const step = climbPace * dt;
      const was = shown;
      shown += Math.max(-step, Math.min(step, target - shown));
      if (wall === null || shown <= 0)
        return { heading, hold: null, x, y: shown, z };
      const reach = (wall.gap / 100 - hugGap) * Math.min(1, shown / hugBy);
      return {
        heading: Math.atan2(wall.south, wall.east),
        hold: shown !== was || shown !== target ? "climbing" : "hanging",
        x: x + wall.east * reach,
        y: shown,
        z: z + wall.south * reach,
      };
    },
  };
}
