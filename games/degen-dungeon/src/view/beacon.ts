import {
  AdditiveBlending,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  OctahedronGeometry,
} from "three";

import type { Point } from "../rules/types.ts";

// Where to go next, in the city: a column of light that can be seen over the rooftops and a spinning gem over the place (whoever or
// whatever is there is the place itself: no ring on the ground). It sits wherever `quest.ts` points, and fades as the hero arrives.
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
  root.add(column, gem);
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
    },
  };
}
