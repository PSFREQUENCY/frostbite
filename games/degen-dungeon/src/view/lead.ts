import { paceOf } from "../rules/move.ts";
import type { DayState } from "../rules/types.ts";
import type { Actor } from "./actor.ts";
import type { Subject } from "./camera.ts";

// How a body carries itself on foot, on top of its walk: crouched low (2), flat out crawling (3), or up in the air for a jump. A jump is
// only a hop on the screen; the rules never hear of it.
export function stance(
  actor: Actor,
  gait: number,
  riding: boolean,
  hop: number,
): void {
  const root = actor.root;
  root.rotation.order = "YXZ";
  const low = !riding && gait === 2;
  const flat = !riding && gait === 3;
  root.scale.set(1, low ? 0.7 : 1, 1);
  root.rotation.x = flat ? 1.42 : 0;
  root.position.y += (flat ? 0.3 : 0) + (riding ? 0 : hop);
}

// How high a jump is (metres) a time after it began (seconds): up and down in a little over half a second.
export const jumpLength = 0.6;
export const hopAt = (since: number): number =>
  since < 0 || since > jumpLength
    ? 0
    : 3.4 * (since / jumpLength) * (1 - since / jumpLength);

// The hero where the rules put them (up on a ride), facing their heading, and the crew a step behind on either side, all walking at the
// hero's pace. The hero carries their stance and their hop; the crew walk upright.
export function placeCast(
  cast: readonly Actor[],
  state: DayState,
  at: Subject,
  seconds: number,
  dt: number,
  hop: number,
): Actor | undefined {
  const riding = state.ride !== "foot";
  const pace =
    state.dir >= 0 && !riding && state.talk === null ? paceOf(state) : 0;
  const { heading } = at;
  const place = (actor: Actor, back: number, side: number): void => {
    actor.root.visible = true;
    actor.root.position.set(
      at.x - Math.cos(heading) * back - Math.sin(heading) * side,
      at.y + (riding ? 0.7 : 0),
      at.z - Math.sin(heading) * back + Math.cos(heading) * side,
    );
    actor.root.rotation.y = Math.PI / 2 - heading;
    actor.move(
      pace,
      seconds,
      dt,
      state.talk !== null,
      state.ended && state.cause === "beach",
    );
  };
  const lead = cast[state.hero];
  if (lead !== undefined) {
    place(lead, 0, 0);
    stance(lead, state.gait, riding, hop);
  }
  state.crew.forEach((hero, slot) => {
    const mate = cast[hero];
    if (mate === undefined) return;
    place(mate, 0.5, slot === 0 ? -1.7 : 1.7);
    stance(mate, 0, riding, 0);
  });
  return lead;
}
