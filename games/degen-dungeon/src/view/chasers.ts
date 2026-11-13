import type { DayState, Point } from "../rules/types.ts";
import { buildCop, buildTux, buildVest, type Actor } from "./actor.ts";
import type { Subject } from "./camera.ts";
import { metres } from "./city.ts";

// Who is after the hero: the cop, the man in the tux and the Vests, each running at the hero from where the rules put them.
export interface Chasers {
  readonly actors: readonly Actor[];
  hide(): void;
  show(state: DayState, to: Subject, seconds: number, dt: number): void;
}

export function buildChasers(): Chasers {
  const cop = buildCop();
  const tux = buildTux();
  const vests = buildVest();
  const chase = (
    actor: Actor,
    at: Point | null,
    to: Subject,
    seconds: number,
    dt: number,
  ): void => {
    if (at === null) return;
    actor.root.visible = true;
    actor.root.position.set(metres(at.x), 0, metres(at.z));
    actor.root.rotation.y = Math.atan2(
      to.x - metres(at.x),
      to.z - metres(at.z),
    );
    actor.move(12, seconds, dt);
  };
  return {
    actors: [cop, tux, vests],
    hide() {
      for (const { root } of [cop, tux, vests]) root.visible = false;
    },
    show(state, to, seconds, dt) {
      chase(cop, state.cop, to, seconds, dt);
      chase(tux, state.tux, to, seconds, dt);
      chase(vests, state.vests, to, seconds, dt);
    },
  };
}
