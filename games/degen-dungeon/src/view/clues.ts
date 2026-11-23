import {
  AdditiveBlending,
  BoxGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  RingGeometry,
  SphereGeometry,
  TorusGeometry,
} from "three";

import { cluesOf, type Clue } from "../quest.ts";
import type { DayState } from "../rules/types.ts";

// What frost vision shows of the clues (`quest.ts` lists them, and the map marks them too): over each one a column of gold light seen
// through walls, a glowing ring on the floor, and the thing itself turning in the air, glowing: a fan of glow sticks, a pizza in its open
// box, a horseshoe magnet and a canister vacuum with its hose.
export interface Clues {
  readonly root: Group;
  show(state: DayState | null, seconds: number): void;
}

const lit = (color: string): MeshBasicMaterial =>
  new MeshBasicMaterial({ color });
const solid = (color: string): MeshStandardMaterial =>
  new MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.9,
    roughness: 0.4,
  });
const part = (
  geometry: BoxGeometry | CylinderGeometry | TorusGeometry,
  material: MeshBasicMaterial | MeshStandardMaterial,
  [x, y, z]: readonly [number, number, number],
  [rx, ry, rz]: readonly [number, number, number] = [0, 0, 0],
): Mesh => {
  const mesh = new Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  return mesh;
};

const things: Readonly<Record<Clue["kind"], () => readonly Mesh[]>> = {
  glow: () =>
    ["#39ff14", "#ff4fd8", "#38e8ff"].map((color, index) =>
      part(
        new CylinderGeometry(0.035, 0.035, 0.6, 8),
        lit(color),
        [(index - 1) * 0.09, 0, 0],
        [0, 0, (index - 1) * 0.35],
      ),
    ),
  magnet: () => [
    part(
      new TorusGeometry(0.24, 0.08, 10, 20, Math.PI),
      solid("#e63946"),
      [0, 0.05, 0],
    ),
    part(new BoxGeometry(0.17, 0.16, 0.17), solid("#d8dee9"), [0.24, -0.06, 0]),
    part(
      new BoxGeometry(0.17, 0.16, 0.17),
      solid("#d8dee9"),
      [-0.24, -0.06, 0],
    ),
  ],
  pizza: () => [
    part(new BoxGeometry(0.62, 0.05, 0.62), solid("#f4f1ea"), [0, -0.05, 0]),
    part(
      new CylinderGeometry(0.27, 0.27, 0.03, 20),
      solid("#ffb347"),
      [0, 0, 0],
    ),
    ...[-0.1, 0.08, 0.02].map((x, index) =>
      part(new CylinderGeometry(0.05, 0.05, 0.02, 10), solid("#d64545"), [
        x,
        0.02,
        [0.06, 0.1, -0.12][index] ?? 0,
      ]),
    ),
    part(
      new BoxGeometry(0.62, 0.62, 0.03),
      solid("#f4f1ea"),
      [0, 0.26, -0.31],
      [-0.25, 0, 0],
    ),
  ],
  vacuum: () => [
    part(
      new CylinderGeometry(0.17, 0.2, 0.42, 14),
      solid("#6a5acd"),
      [0, 0, 0],
      [0, 0, Math.PI / 2],
    ),
    part(
      new TorusGeometry(0.22, 0.035, 8, 16, Math.PI),
      solid("#2a2f45"),
      [0.32, 0.18, 0],
    ),
    part(new BoxGeometry(0.06, 0.5, 0.06), solid("#c9ced6"), [0.54, 0.02, 0]),
    part(new BoxGeometry(0.26, 0.05, 0.1), solid("#2a2f45"), [0.54, -0.24, 0]),
  ],
};

export function buildClues(): Clues {
  const root = new Group();
  root.name = "clues";
  const beam = new MeshBasicMaterial({
    blending: AdditiveBlending,
    color: "#ffe066",
    depthTest: false,
    depthWrite: false,
    opacity: 0.32,
    side: DoubleSide,
    transparent: true,
  });
  const kinds: readonly Clue["kind"][] = ["glow", "magnet", "pizza", "vacuum"];
  const marks = kinds.map((kind) => {
    const mark = new Group();
    mark.name = `clue-${kind}`;
    const pillar = new Mesh(
      new CylinderGeometry(0.7, 0.7, 60, 16, 1, true),
      beam,
    );
    pillar.position.y = 30;
    pillar.renderOrder = 5;
    const ring = new Mesh(new RingGeometry(0.9, 1.25, 32), beam);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.05;
    const thing = new Group();
    thing.name = "thing";
    // The thing itself, inside a soft golden glow.
    const halo = new Mesh(new SphereGeometry(0.75, 16, 12), beam);
    thing.add(halo, ...things[kind]());
    thing.scale.setScalar(2.4);
    mark.add(pillar, ring, thing);
    root.add(mark);
    return { kind, mark, thing };
  });
  return {
    root,
    show(state, seconds) {
      const shown: readonly Clue[] =
        state !== null && state.looking ? cluesOf(state) : [];
      beam.opacity = 0.26 + Math.sin(seconds * 4) * 0.08;
      for (const { kind, mark, thing } of marks) {
        const clue = shown.find((one) => one.kind === kind);
        mark.visible = clue !== undefined;
        if (clue === undefined) continue;
        mark.position.set(clue.x / 100, 0, clue.z / 100);
        thing.position.y = 2.2 + Math.sin(seconds * 2) * 0.15;
        thing.rotation.y = seconds * 1.5;
      }
    },
  };
}
