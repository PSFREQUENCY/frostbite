import {
  AdditiveBlending,
  CapsuleGeometry,
  ConeGeometry,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  RingGeometry,
} from "three";

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
// along his route (`rules/errands.ts`), picked out so he is easy to follow through a crowd: a red ring round his feet and a red arrow
// bobbing over his head, seen through walls (the beacon and the map point at him too, `quest.ts`).
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
  const red = new MeshBasicMaterial({
    blending: AdditiveBlending,
    color: "#ff2d55",
    depthTest: false,
    depthWrite: false,
    side: DoubleSide,
    transparent: true,
  });
  const ring = new Mesh(new RingGeometry(1, 1.4, 32), red);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.06;
  const arrow = new Mesh(new ConeGeometry(0.55, 1.1, 4), red);
  arrow.rotation.x = Math.PI;
  arrow.name = "thief-arrow";
  // A red glow round his whole body, through the crowd and round corners.
  const aura = new Mesh(new CapsuleGeometry(0.55, 1.1, 6, 12), red);
  aura.position.y = 0.95;
  aura.scale.z = 0.7;
  for (const mark of [ring, arrow, aura]) mark.renderOrder = 6;
  thief.root.add(ring, arrow, aura);
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
      arrow.position.y = 2.9 + Math.abs(Math.sin(seconds * 4)) * 0.35;
      arrow.rotation.y = seconds * 3;
      red.opacity = 0.45 + Math.sin(seconds * 8) * 0.2;
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
