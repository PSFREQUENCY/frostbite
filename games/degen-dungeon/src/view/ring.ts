import type { Object3D } from "three";

import { heroCount, type Actor } from "./actor.ts";
import type { Pose } from "./camera.ts";

// The hero ring before a day: the cast on a turntable in the Old Floe, turning the short way round to bring the chosen hero to the front.
// A hero still locked stands as a dark shape.
export const ring = { radius: 3.4, x: 300, z: 64 };

export function createRing(cast: readonly Actor[], shadow: Object3D) {
  let spin = 0;
  return (hero: number, locked: boolean, seconds: number, dt: number): Pose => {
    const turn = ((hero - spin + heroCount * 1.5) % heroCount) - heroCount / 2;
    spin += turn * (1 - Math.exp(-8 * Math.max(0, dt)));
    cast.slice(0, heroCount).forEach((actor, slot) => {
      const angle = ((slot - spin) * Math.PI * 2) / heroCount;
      const here = [
        ring.x + Math.sin(angle) * ring.radius,
        0,
        ring.z + Math.cos(angle) * ring.radius,
      ] as const;
      const hidden = locked && slot === hero;
      actor.root.visible = !hidden;
      actor.root.position.set(...here);
      actor.root.rotation.set(0, angle, 0);
      actor.root.scale.set(1, 1, 1);
      actor.move(0, seconds, dt, false, slot === hero);
      if (!hidden) return;
      shadow.visible = true;
      shadow.position.set(here[0], 0.85, here[2]);
    });
    return {
      fov: 38,
      from: [ring.x, 2.4, ring.z + 10],
      look: [ring.x, 1.2, ring.z + ring.radius],
    };
  };
}
