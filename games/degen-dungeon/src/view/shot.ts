import { roofLevel } from "../rules/climb.ts";
import { onLetterTop } from "../rules/mountain.ts";
import { roomAt } from "../rules/rooms.ts";
import { venueAt } from "../rules/venues.ts";
import { flies, type DayState } from "../rules/types.ts";
import type { Intent, Room } from "./camera.ts";

// Which shot a moment calls for: a talk's two-shot, hands when a spot is used, the sky from a helicopter or a saucer, a wide one on a ride or the
// road north, the lookout over the city for a hero sitting on a WAGMI letter, and the shoulder camera otherwise.
export const intentFor = (state: DayState, closeUp: boolean): Intent =>
  state.talk !== null
    ? "talk"
    : closeUp
      ? "hands"
      : flies(state.ride)
        ? "sky"
        : state.ride !== "foot" || state.gate > 0
          ? "ride"
          : state.level === roofLevel && onLetterTop(state.x, state.z)
            ? "vista"
            : "follow";

// What the camera should know of the place: indoors in a shop, low in a crouch or a crawl, how open the ground is, and how fast.
export const roomFor = (state: DayState, open: number): Room => {
  const riding = state.ride !== "foot";
  return {
    indoors:
      roomAt(state.x, state.z) !== null ||
      (venueAt(state.x, state.z)?.door ?? null) !== null,
    low: !riding && state.gait >= 2,
    open,
    speed: riding ? 1 : state.gait === 1 && state.dir >= 0 ? 0.6 : 0,
  };
};
