import {
  AdditiveBlending,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  OctahedronGeometry,
  RingGeometry,
} from "three";

import type { Point } from "../rules/types.ts";

// Where to go next, in the city: a column of light that can be seen over the rooftops, a spinning gem over the place, and a ring that
// pulses on the ground there. It sits wherever `quest.ts` points, and fades as the hero arrives.
export interface Beacon {
  readonly root: Group;
  show(at: Point | null, x: number, z: number, seconds: number): void;
}

export function buildBeacon(): Beacon {
  const root = new Group();
  root.name = "beacon";
  const glow = (colour: string, opacity: number): MeshBasicMaterial =>
    new MeshBasicMaterial({
      blending: AdditiveBlending,
      color: colour,
      depthWrite: false,
      fog: false,
      opacity,
      transparent: true,
    });
  const column = new Mesh(
    new CylinderGeometry(0.9, 1.4, 140, 16, 1, true),
    glow("#5beac6", 0.22),
  );
  column.position.y = 70;
  const gem = new Mesh(
    new OctahedronGeometry(1.1),
    new MeshBasicMaterial({ color: "#ffd166" }),
  );
  gem.name = "beacon-gem";
  const ring = new Mesh(new RingGeometry(1.6, 2.2, 32), glow("#5beac6", 0.6));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.08;
  root.add(column, gem, ring);
  return {
    root,
    show(at, x, z, seconds) {
      root.visible = at !== null;
      if (at === null) return;
      root.position.set(at.x / 100, 0, at.z / 100);
      const near = Math.hypot(at.x / 100 - x, at.z / 100 - z);
      column.material.opacity = Math.min(0.22, near / 120);
      gem.position.y = 3.2 + Math.sin(seconds * 2.4) * 0.3;
      gem.rotation.y = seconds * 1.8;
      const pulse = 1 + ((seconds * 0.8) % 1) * 0.8;
      ring.scale.set(pulse, pulse, pulse);
      ring.material.opacity = 0.7 * (1 - ((seconds * 0.8) % 1));
    },
  };
}
