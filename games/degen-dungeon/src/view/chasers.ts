import { isFrozen } from "../rules/freeze.ts";
import type { DayState, Point } from "../rules/types.ts";
import {
  buildCop,
  buildThief,
  buildTux,
  buildVest,
  type Actor,
} from "./actor.ts";
import type { Subject } from "./camera.ts";
import { metres } from "./city.ts";

// Who is after the hero: the cop, the man in the tux and the Vests, each running at the hero from where the rules put them, except one
// the freeze ray caught, who stands frozen mid-stride. And who the hero is after: the purse snatcher on the first morning, running away
// along his route (`rules/errands.ts`).
export interface Chasers {
  readonly actors: readonly Actor[];
  hide(): void;
  show(state: DayState, to: Subject, seconds: number, dt: number): void;
}

export function buildChasers(): Chasers {
  const cop = buildCop();
  const tux = buildTux();
  const vests = buildVest();
  const thief = buildThief();
  let fled = { x: 0, z: 0 };
  const chase = (
    actor: Actor,
    at: Point | null,
    to: Subject,
    seconds: number,
    dt: number,
    still = false,
  ): void => {
    if (at === null) return;
    actor.root.visible = true;
    actor.root.position.set(metres(at.x), 0, metres(at.z));
    if (still) return;
    actor.root.rotation.y = Math.atan2(
      to.x - metres(at.x),
      to.z - metres(at.z),
    );
    actor.move(12, seconds, dt);
  };
  return {
    actors: [cop, tux, vests, thief],
    hide() {
      for (const { root } of [cop, tux, vests, thief]) root.visible = false;
    },
    show(state, to, seconds, dt) {
      chase(cop, state.cop, to, seconds, dt, isFrozen(state, "cop"));
      chase(tux, state.tux, to, seconds, dt, isFrozen(state, "tux"));
      chase(vests, state.vests, to, seconds, dt);
      // The thief runs the way he is going: he faces from where he was to where he is.
      const running = state.thief;
      thief.root.visible = running !== null;
      if (running === null) return;
      const ahead = {
        heading: 0,
        x: metres(running.x) * 2 - fled.x,
        y: 0,
        z: metres(running.z) * 2 - fled.z,
      };
      if (ahead.x !== metres(running.x) || ahead.z !== metres(running.z))
        chase(thief, running, ahead, seconds, dt);
      else {
        // At the end of his way out he stops, out of breath.
        thief.root.position.set(metres(running.x), 0, metres(running.z));
        thief.move(0, seconds, dt);
      }
      fled = { x: metres(running.x), z: metres(running.z) };
    },
  };
}
