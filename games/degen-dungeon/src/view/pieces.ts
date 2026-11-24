import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshToonMaterial,
  SphereGeometry,
  TorusGeometry,
  type BufferGeometry,
  type Material,
} from "three";

import type { Spot } from "../rules/places.ts";
import { toonSteps } from "./textures.ts";

// The things at the island's places, each a few simple shapes (`things.ts` sets them out): S's letters as sealed envelopes, scraps of
// paper, words scratched in a patch of ice, a sack of loot, the courier desks' parcels, the drop boxes, the Faucet's tap, the hideout's
// chest freezer, the dead locker, the humming basement's door and the Rebrand booth. A piece marked to glow is lit by nothing but itself.
export type Shape = "ball" | "box" | "post" | "ring";
export type Piece = readonly [
  shape: Shape,
  colour: string,
  size: readonly [number, number, number],
  at: readonly [number, number, number],
  glow?: boolean,
];
const coin = (x: number, z: number): Piece => [
  "post",
  "#ffd166",
  [0.07, 0.02, 0.07],
  [x, 0.02, z],
  true,
];
export const pieces: Readonly<Partial<Record<Spot["kind"], readonly Piece[]>>> =
  {
    drop: [
      ["box", "#2f6fb5", [0.6, 1, 0.5], [0, 0.5, 0]],
      ["box", "#11131c", [0.4, 0.05, 0.02], [0, 0.82, 0.26]],
      ["box", "#ffd166", [0.5, 0.12, 0.02], [0, 0.62, 0.26], true],
    ],
    faucet: [
      ["post", "#c7d2e0", [0.22, 1.3, 0.22], [0, 0.65, 0]],
      ["box", "#c7d2e0", [0.12, 0.12, 0.6], [0, 1.25, 0.25]],
      ["ring", "#5beac6", [0.35, 0.35, 0.35], [0, 0.15, 0.5], true],
      ["ball", "#5beac6", [0.06, 0.06, 0.06], [0, 0.9, 0.52], true],
    ],
    freezer: [
      ["box", "#dfe6ee", [1.4, 0.9, 0.8], [0, 0.45, 0]],
      ["box", "#9fb3c8", [1.42, 0.06, 0.82], [0, 0.92, 0]],
      ["box", "#11131c", [0.4, 0.06, 0.06], [0, 0.8, 0.42]],
    ],
    heroword: [
      ["box", "#cfefff", [1.6, 0.02, 1], [0, 0.02, 0]],
      ["box", "#5beac6", [1, 0.01, 0.05], [0, 0.035, -0.2], true],
      ["box", "#5beac6", [0.7, 0.01, 0.05], [-0.1, 0.035, 0.05], true],
      ["box", "#5beac6", [0.9, 0.01, 0.05], [0.05, 0.035, 0.3], true],
    ],
    letter: [
      ["box", "#f4f1ea", [0.36, 0.02, 0.25], [0, 0.03, 0]],
      ["box", "#e0dbcf", [0.36, 0.005, 0.12], [0, 0.042, -0.06]],
      ["ball", "#d64545", [0.045, 0.02, 0.045], [0, 0.05, 0], true],
    ],
    locker: [
      ...[-0.55, 0, 0.55].flatMap((x): Piece[] => [
        ["box", "#5d6470", [0.52, 1.9, 0.5], [x, 0.95, 0]],
        ["box", "#3a3f47", [0.08, 0.12, 0.02], [x + 0.15, 1, 0.26]],
      ]),
      ["box", "#ff4d5e", [0.14, 0.1, 0.02], [0, 1.3, 0.27], true],
    ],
    loot: [
      ["ball", "#8a5a3a", [0.32, 0.36, 0.3], [0, 0.34, 0]],
      ["ball", "#8a5a3a", [0.12, 0.1, 0.12], [0, 0.72, 0]],
      coin(0.4, 0.1),
      coin(0.3, -0.2),
      coin(-0.35, 0.25),
      coin(-0.2, -0.35),
    ],
    plug: [
      ["box", "#3a3f47", [1.2, 2, 0.15], [0, 1, 0]],
      ["box", "#22283a", [0.9, 1.7, 0.05], [0, 0.88, 0.09]],
      ["ball", "#c9b6ff", [0.12, 0.12, 0.12], [0, 2.15, 0.15], true],
    ],
    rebrand: [
      ["box", "#ff3df2", [1.5, 2.3, 1.5], [0, 1.15, 0]],
      ["box", "#2a2350", [0.9, 1.8, 0.05], [0, 0.95, 0.76]],
      ["box", "#ffd166", [1.2, 0.3, 0.05], [0, 2.05, 0.77], true],
    ],
    tool: [["box", "#8a6a4a", [1, 0.15, 1], [0, 0.075, 0]]],
    word: [
      ["box", "#f7f3d7", [0.3, 0.01, 0.22], [0, 0.015, 0]],
      ["box", "#3a3f47", [0.22, 0.005, 0.02], [0, 0.022, -0.04]],
      ["box", "#3a3f47", [0.18, 0.005, 0.02], [0, 0.022, 0.03]],
    ],
    gig: [
      ["box", "#c98a4b", [0.6, 0.45, 0.5], [0.5, 0.225, 0]],
      ["box", "#b37a40", [0.5, 0.4, 0.45], [0.5, 0.65, 0.05]],
      ["box", "#c98a4b", [0.45, 0.35, 0.4], [1.05, 0.175, -0.1]],
    ],
  };
const geometries: Readonly<Record<Shape, BufferGeometry>> = {
  ball: new SphereGeometry(1, 12, 8),
  box: new BoxGeometry(1, 1, 1),
  post: new CylinderGeometry(1, 1, 1, 12),
  ring: new TorusGeometry(1, 0.22, 8, 20),
};
const materials = new Map<string, Material>();
const material = (colour: string, glow: boolean): Material => {
  const key = `${colour}${glow ? "!" : ""}`;
  const known = materials.get(key);
  if (known !== undefined) return known;
  const made = glow
    ? new MeshBasicMaterial({ color: colour })
    : new MeshToonMaterial({ color: colour, gradientMap: toonSteps });
  materials.set(key, made);
  return made;
};
export const build = (list: readonly Piece[]): Group => {
  const group = new Group();
  for (const [shape, colour, size, at, glow = false] of list) {
    const mesh = new Mesh(geometries[shape], material(colour, glow));
    mesh.scale.set(...size);
    mesh.position.set(...at);
    group.add(mesh);
  }
  return group;
};
