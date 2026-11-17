import {
  BufferAttribute,
  CapsuleGeometry,
  Color,
  CylinderGeometry,
  Group,
  Mesh,
  MeshToonMaterial,
  TorusGeometry,
  type BufferGeometry,
  type Object3D,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import { statues } from "../rules/statues.ts";
import { maskParts, masks, shapeGeometry } from "./masks.ts";
import { toonSteps } from "./textures.ts";

// The nine statues on their plinths, one in each borough's middle street: athletes caught at full sprint, every muscle carved (chest,
// shoulders, arms, the hands held flat, thighs, knees, calves and feet on their toes), each in its own stone and its own mask. The Ice
// Runner in The Old Floe is the Time Machine: when the hero reaches the top it lifts off its plinth on a column of light and the ring
// opens on the street round it.
export interface Statue {
  // Eases the Ice Runner toward risen or asleep, and turns the ring.
  pose(risen: boolean, seconds: number, dt: number): void;
  readonly root: Group;
}

type Triple = readonly [number, number, number];
// Each statue's stone, by the rules' order.
export const stones: readonly string[] = [
  "#b07a3a",
  "#efeae2",
  "#bfe9ff",
  "#c9ced8",
  "#d9a63a",
  "#e8b8c8",
  "#c1653d",
  "#5d6470",
  "#d8b47a",
];
const scale = 1.35;
const plinthHeight = 1;
const ice = 2;

const unit = (shape: "ball" | "box" | "pill" | "post"): BufferGeometry =>
  shape === "pill"
    ? new CapsuleGeometry(0.5, 1, 6, 12).scale(1, 0.5, 1)
    : shapeGeometry(shape);

// A runner at full sprint (metres, for a body 1.8 metres tall), its parts in a tree of joints so each limb bends where a body does, then
// merged into one shape with its colours in its vertices, standing on its toes at height 0.
export function athlete(stone: string, mask: number): BufferGeometry {
  const root = new Group();
  const joint = (parent: Object3D, at: Triple, turn: Triple = [0, 0, 0]) => {
    const group = new Group();
    group.position.set(...at);
    group.rotation.set(...turn);
    parent.add(group);
    return group;
  };
  const add = (
    parent: Object3D,
    shape: "ball" | "box" | "pill" | "post",
    size: Triple,
    at: Triple,
    turn: Triple = [0, 0, 0],
    colour = stone,
  ): void => {
    const mesh = new Mesh(unit(shape));
    mesh.scale.set(...size);
    mesh.position.set(...at);
    mesh.rotation.set(...turn);
    mesh.userData.colour = colour;
    parent.add(mesh);
  };
  const hips = joint(root, [0, 0.98, 0]);
  add(hips, "ball", [0.34, 0.24, 0.24], [0, 0, 0]);
  for (const side of [-1, 1])
    add(hips, "ball", [0.17, 0.18, 0.16], [side * 0.08, -0.02, -0.09]);
  const spine = joint(hips, [0, 0.08, 0], [0.28, 0, 0]);
  add(spine, "pill", [0.26, 0.28, 0.18], [0, 0.13, 0.01]);
  for (let row = 0; row < 3; row += 1)
    for (const side of [-1, 1])
      add(
        spine,
        "ball",
        [0.07, 0.06, 0.04],
        [side * 0.045, 0.06 + row * 0.075, 0.095],
      );
  const chest = joint(spine, [0, 0.27, 0]);
  add(chest, "ball", [0.36, 0.3, 0.22], [0, 0.08, 0]);
  for (const side of [-1, 1]) {
    add(
      chest,
      "ball",
      [0.16, 0.11, 0.07],
      [side * 0.075, 0.12, 0.09],
      [0, 0, side * 0.2],
    );
    add(chest, "ball", [0.1, 0.24, 0.14], [side * 0.15, 0.04, -0.02]);
  }
  add(chest, "ball", [0.26, 0.08, 0.12], [0, 0.24, -0.03]);
  const neck = joint(chest, [0, 0.26, 0.01], [-0.3, 0, 0]);
  add(neck, "pill", [0.1, 0.12, 0.1], [0, 0.05, 0]);
  const head = joint(neck, [0, 0.16, 0.02]);
  add(head, "ball", [0.2, 0.24, 0.22], [0, 0, 0]);
  add(head, "ball", [0.15, 0.1, 0.14], [0, -0.07, 0.03]);
  const r = 0.11;
  for (const [shape, colour, size, at, turn] of maskParts(mask))
    add(
      head,
      shape,
      [size[0] * r, size[1] * r, size[2] * r],
      [at[0] * r, at[1] * r, at[2] * r],
      turn,
      colour,
    );
  // The arms: the left (in front) swung forward and bent hard, the right swung back; the hands held flat, fingers together.
  for (const [side, swing, bend] of [
    [-1, -0.9, -1.5],
    [1, 0.85, -1.4],
  ] as const) {
    const shoulder = joint(
      chest,
      [side * 0.2, 0.2, 0],
      [swing, 0, side * 0.12],
    );
    add(shoulder, "ball", [0.13, 0.13, 0.13], [side * 0.02, 0, 0]);
    add(shoulder, "pill", [0.1, 0.3, 0.1], [0, -0.15, 0]);
    add(shoulder, "ball", [0.08, 0.13, 0.08], [0, -0.13, 0.03]);
    add(shoulder, "ball", [0.08, 0.14, 0.08], [0, -0.13, -0.03]);
    const elbow = joint(shoulder, [0, -0.3, 0], [bend, 0, 0]);
    add(elbow, "pill", [0.085, 0.27, 0.085], [0, -0.135, 0]);
    add(elbow, "ball", [0.08, 0.11, 0.08], [0, -0.07, 0]);
    const wrist = joint(elbow, [0, -0.27, 0]);
    add(wrist, "box", [0.07, 0.09, 0.03], [0, -0.045, 0]);
    for (let finger = 0; finger < 4; finger += 1)
      add(
        wrist,
        "pill",
        [0.016, 0.075, 0.016],
        [-0.026 + finger * 0.0175, -0.12, 0],
      );
    add(
      wrist,
      "pill",
      [0.018, 0.05, 0.018],
      [side * -0.04, -0.03, 0.02],
      [0, 0, side * 0.6],
    );
  }
  // The legs: the right driving up in front, knee high; the left pushing off behind, on its toes.
  for (const [side, lift, knee, ankle] of [
    [1, -1.25, 1.6, -0.25],
    [-1, 0.55, 0.35, 0.7],
  ] as const) {
    const hip = joint(hips, [side * 0.1, -0.04, 0], [lift, 0, 0]);
    add(hip, "pill", [0.17, 0.45, 0.17], [0, -0.22, 0]);
    add(hip, "ball", [0.13, 0.26, 0.1], [0, -0.18, 0.05]);
    add(hip, "ball", [0.12, 0.24, 0.1], [0, -0.2, -0.04]);
    const shin = joint(hip, [0, -0.45, 0], [knee, 0, 0]);
    add(shin, "ball", [0.07, 0.07, 0.05], [0, 0, 0.055]);
    add(shin, "pill", [0.11, 0.44, 0.11], [0, -0.22, 0]);
    add(shin, "ball", [0.1, 0.2, 0.11], [0, -0.1, -0.045]);
    const foot = joint(shin, [0, -0.44, 0], [ankle, 0, 0]);
    add(foot, "pill", [0.09, 0.06, 0.24], [0, -0.035, 0.07]);
    add(foot, "ball", [0.08, 0.04, 0.06], [0, -0.04, 0.19]);
  }
  root.updateMatrixWorld(true);
  const pieces: BufferGeometry[] = [];
  const tint = new Color();
  root.traverse((part) => {
    if (!(part instanceof Mesh)) return;
    const geometry = part.geometry.clone().applyMatrix4(part.matrixWorld);
    const colour =
      typeof part.userData.colour === "string" ? part.userData.colour : stone;
    tint.set(colour);
    const count = geometry.getAttribute("position").count;
    const colours = new Float32Array(count * 3);
    for (let at = 0; at < count; at += 1)
      colours.set([tint.r, tint.g, tint.b], at * 3);
    geometry.setAttribute("color", new BufferAttribute(colours, 3));
    pieces.push(geometry);
  });
  const whole = mergeGeometries(pieces) ?? unit("ball");
  whole.computeBoundingBox();
  whole.translate(0, -(whole.boundingBox?.min.y ?? 0), 0);
  return whole;
}

export function buildStatue(): Statue {
  const root = new Group();
  root.name = "statues";
  const base = new CylinderGeometry(1, 1.15, plinthHeight, 32);
  const rim = new TorusGeometry(1.02, 0.05, 8, 48);
  const stonework = new MeshToonMaterial({
    color: "#2b2f45",
    gradientMap: toonSteps,
  });
  let runner: Group | null = null;
  statues.forEach(({ x, z }, index) => {
    const place = new Group();
    place.name = `statue-${String(index)}`;
    place.position.set(x / 100, 0, z / 100);
    // Every statue faces along its street, toward the middle of the borough.
    place.rotation.y = x % 12_000 < 6_000 ? Math.PI / 2 : -Math.PI / 2;
    const plinth = new Mesh(base, stonework);
    plinth.position.y = plinthHeight / 2;
    const glow = new Mesh(
      rim,
      new MeshToonMaterial({
        color: masks[index]?.detail ?? "#ffffff",
        emissive: masks[index]?.detail ?? "#ffffff",
        gradientMap: toonSteps,
      }),
    );
    glow.rotation.x = Math.PI / 2;
    glow.position.y = plinthHeight;
    const figure = new Group();
    figure.name = index === ice ? "runner" : "figure";
    figure.position.y = plinthHeight;
    figure.scale.setScalar(scale);
    const body = new Mesh(
      athlete(stones[index] ?? "#ffffff", index),
      new MeshToonMaterial({
        color: "#ffffff",
        emissive: index === ice ? "#1d5d7a" : "#000000",
        gradientMap: toonSteps,
        vertexColors: true,
      }),
    );
    body.castShadow = true;
    figure.add(body);
    place.add(plinth, glow, figure);
    root.add(place);
    if (index === ice) runner = figure;
  });
  const ring = new Mesh(
    new TorusGeometry(2.2, 0.14, 8, 40),
    new MeshToonMaterial({
      color: "#5beac6",
      emissive: "#5beac6",
      gradientMap: toonSteps,
    }),
  );
  ring.name = "machine";
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.2;
  root.getObjectByName(`statue-${String(ice)}`)?.add(ring);
  let lift = 0;
  const settle = (): void => {
    runner?.position.set(0, plinthHeight + lift * 3.6, 0);
    ring.visible = lift > 0.5;
    ring.scale.setScalar(0.6 + 0.4 * lift);
  };
  settle();
  return {
    pose(risen, seconds, dt) {
      lift += ((risen ? 1 : 0) - lift) * (1 - Math.exp(-1.5 * Math.max(0, dt)));
      settle();
      ring.rotation.z = seconds;
    },
    root,
  };
}
