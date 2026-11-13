import { roomAt } from "../rules/rooms.ts";
import type { DayState } from "../rules/types.ts";
import type { Intent, Room } from "./camera.ts";

// Which shot a moment calls for: a talk's two-shot, hands when a spot is used, the sky from a helicopter, a wide one on a ride or the
// road north, and the shoulder camera otherwise.
export const intentFor = (state: DayState, closeUp: boolean): Intent =>
  state.talk !== null
    ? "talk"
    : closeUp
      ? "hands"
      : state.ride === "heli"
        ? "sky"
        : state.ride !== "foot" || state.gate > 0
          ? "ride"
          : "follow";

// What the camera should know of the place: indoors in a shop, low in a crouch or a crawl, how open the ground is, and how fast.
export const roomFor = (state: DayState, open: number): Room => {
  const riding = state.ride !== "foot";
  return {
    indoors: roomAt(state.x, state.z) !== null,
    low: !riding && state.gait >= 2,
    open,
    speed: riding ? 1 : state.gait === 1 && state.dir >= 0 ? 0.6 : 0,
  };
};
