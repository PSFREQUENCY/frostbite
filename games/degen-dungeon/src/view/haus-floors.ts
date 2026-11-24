import {
  CylinderGeometry,
  Group,
  Mesh,
  SphereGeometry,
  TorusGeometry,
  type MeshBasicMaterial,
  type MeshToonMaterial,
} from "three";

import { branchOf, haus, penthouseFloor } from "../rules/haus.ts";
import type { DayState } from "../rules/types.ts";
import { buildTop } from "./haus-top.ts";
import { settle } from "./settle.ts";

// Haus De Savage's floors (`haus.ts` draws the trunk and the elevators): each a disc of floor round the trunk with a glass rail, a neon
// edge and a hedge of greenery, the colours climbing from teal to violet to gold, and a branch held out to a round garden with a tree, its
// own on every floor; the sky garden (7) has a fountain among its trees and the sky spa (14) a hot tub and loungers. The penthouse (20)
// and the roof (21) are `haus-top.ts`'s. All of it but the pool's light and the leaves' sway is joined into a few draws.
export const storeyHeight = 4;
export interface Floors {
  readonly root: Group;
  show(day: DayState | null, seconds: number): void;
}
interface Paints {
  glass(color: string, opacity: number): MeshBasicMaterial;
  lit(color: string): MeshBasicMaterial;
  toon(color: string): MeshToonMaterial;
}
const edges = [
  "#38e8ff",
  "#5beac6",
  "#6aa8ff",
  "#b06bff",
  "#ff3df2",
  "#ffd166",
] as const;
const local = (point: {
  readonly x: number;
  readonly z: number;
}): readonly [number, number] => [
  (point.x - haus.x) / 100,
  (point.z - haus.z) / 100,
];

export function buildFloors(paints: Paints): Floors {
  const root = new Group();
  root.name = "haus-floors";
  // One material for each colour, so the floors join into as few draws as there are colours.
  const lights = new Map<string, MeshBasicMaterial>();
  const toons = new Map<string, MeshToonMaterial>();
  const lit = (color: string): MeshBasicMaterial => {
    const made = lights.get(color) ?? paints.lit(color);
    lights.set(color, made);
    return made;
  };
  const toon = (color: string): MeshToonMaterial => {
    const made = toons.get(color) ?? paints.toon(color);
    toons.set(color, made);
    return made;
  };
  const glass = (color: string, opacity: number): MeshBasicMaterial => {
    const key = `${color}/${String(opacity)}`;
    const made = lights.get(key) ?? paints.glass(color, opacity);
    lights.set(key, made);
    return made;
  };
  const slab = toon("#d9c3a5");
  const bush = toon("#2f8f4a");
  const rail = glass("#bff3ff", 0.22);
  const leaves = toon("#3fae6b");
  const wood = toon("#6b4a2f");
  const water = lit("#2fd3ff");
  const put = <T extends Mesh>(mesh: T, x: number, y: number, z: number): T => {
    mesh.position.set(x, y, z);
    root.add(mesh);
    return mesh;
  };
  const disc = (
    radius: number,
    y: number,
    x = 0,
    z = 0,
    material = slab,
  ): Mesh =>
    put(
      new Mesh(new CylinderGeometry(radius, radius * 0.96, 0.35, 40), material),
      x,
      y - 0.175,
      z,
    );
  const ring = (
    radius: number,
    y: number,
    color: string,
    x = 0,
    z = 0,
  ): void => {
    const torus = put(
      new Mesh(new TorusGeometry(radius, 0.06, 6, 64), lit(color)),
      x,
      y,
      z,
    );
    torus.rotation.x = Math.PI / 2;
  };
  const fence = (radius: number, y: number, x = 0, z = 0): void =>
    void put(
      new Mesh(new CylinderGeometry(radius, radius, 1.1, 40, 1, true), rail),
      x,
      y + 0.55,
      z,
    );
  const tree = (x: number, y: number, z: number, size = 1): void => {
    put(
      new Mesh(
        new CylinderGeometry(0.15 * size, 0.22 * size, 2 * size, 6),
        wood,
      ),
      x,
      y + size,
      z,
    );
    for (const [dx, dy, dz] of [
      [0, 2.3, 0],
      [0.6, 1.9, 0.3],
      [-0.5, 2, -0.4],
    ] as const)
      put(
        new Mesh(new SphereGeometry(0.9 * size, 10, 8), leaves),
        x + dx * size,
        y + dy * size,
        z + dz * size,
      );
  };
  for (let floor = 1; floor < penthouseFloor; floor += 1) {
    const y = floor * storeyHeight;
    const colour =
      edges[Math.floor((floor - 1) / 4) % edges.length] ?? "#38e8ff";
    disc(11, y);
    fence(11, y);
    ring(11, y + 0.02, colour);
    // A hedge of greenery round the floor's edge, a vertical forest from afar.
    for (let leaf = 0; leaf < 12; leaf += 1) {
      const angle = (leaf * Math.PI * 2) / 12 + floor * 0.4;
      put(
        new Mesh(new SphereGeometry(0.8, 8, 6), bush),
        Math.sin(angle) * 10.2,
        y + 0.5,
        Math.cos(angle) * 10.2,
      ).scale.set(1.3, 0.8, 1.3);
    }
    // The branch out to the floor's garden.
    const [bx, bz] = local(branchOf(floor));
    const angle = Math.atan2(bx, bz);
    const beam = put(
      new Mesh(new CylinderGeometry(0.5, 0.9, 6, 8), toon("#4a2f22")),
      bx * 0.6,
      y - 0.4,
      bz * 0.6,
    );
    beam.rotation.set(Math.PI / 2, angle, 0, "YXZ");
    disc(4.5, y, bx, bz);
    fence(4.5, y, bx, bz);
    ring(4.5, y + 0.02, colour, bx, bz);
    tree(bx, y, bz, floor % 7 === 0 ? 1.3 : 1);
    if (floor === 7) {
      tree(bx + 2.4, y, bz - 1.5, 0.8);
      tree(bx - 2.2, y, bz + 1.6, 0.8);
      put(
        new Mesh(new CylinderGeometry(1.2, 1.3, 0.4, 24), water),
        bx + 1.6,
        y + 0.2,
        bz + 1.8,
      );
    }
    if (floor === 14) {
      put(
        new Mesh(new CylinderGeometry(1.5, 1.5, 0.5, 24), water),
        bx - 1.8,
        y + 0.25,
        bz,
      );
      for (const side of [-1, 1])
        put(
          new Mesh(new CylinderGeometry(0.45, 0.45, 1.8, 8), toon("#f4f8ff")),
          bx + 1.6,
          y + 0.3,
          bz + side * 1.2,
        ).rotation.set(Math.PI / 2, 0, 0.2);
    }
  }
  // The penthouse and the roof (`haus-top.ts`).
  const canopy = buildTop({
    disc,
    fence,
    glass,
    put,
    ring,
    storey: storeyHeight,
    toon,
    water,
  });
  root.add(canopy);
  settle(root, (mesh) => mesh.name !== "" || mesh.parent !== root);
  return {
    root,
    show(_day, seconds) {
      canopy.rotation.y = Math.sin(seconds * 0.2) * 0.02;
      water.color.setHSL(0.53, 0.9, 0.55 + Math.sin(seconds * 2) * 0.05);
    },
  };
}
