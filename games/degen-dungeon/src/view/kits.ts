import {
  BoxGeometry,
  CylinderGeometry,
  Euler,
  Float32BufferAttribute,
  Group,
  Matrix4,
  Mesh,
  MeshToonMaterial,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  Vector3,
  type BufferGeometry,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import type { Ride } from "../rules/types.ts";
import { toonSteps } from "./textures.ts";

// The rides, built in code and facing along +z: a car with glass, lights and four wheels, a kick scooter, a bike, a little yacht, and a
// helicopter. A part painted "paint" takes the ride's own colour (each parked car is its own colour); the rest keep theirs.
export type Part = readonly [
  shape: "ball" | "box" | "ring" | "wheel",
  colour: string,
  size: readonly [number, number, number],
  at: readonly [number, number, number],
];
const wheels = (
  x: number,
  y: number,
  z: number,
  r: number,
  w: number,
): Part[] =>
  [
    [x, z],
    [-x, z],
    [x, -z],
    [-x, -z],
  ].map(([px = 0, pz = 0]): Part => [
    "wheel",
    "#11131c",
    [r, w, r],
    [px, y, pz],
  ]);
export const kits: Readonly<Record<Exclude<Ride, "foot">, readonly Part[]>> = {
  bike: [
    ["box", "paint", [0.06, 0.06, 1], [0, 0.78, 0]],
    ["box", "paint", [0.06, 0.62, 0.06], [0, 0.55, -0.22]],
    ["box", "paint", [0.06, 0.06, 0.9], [0, 0.5, 0.12]],
    ["box", "#11131c", [0.05, 0.62, 0.05], [0, 0.6, 0.5]],
    ["box", "#11131c", [0.62, 0.05, 0.05], [0, 0.98, 0.48]],
    ["box", "#11131c", [0.18, 0.06, 0.3], [0, 0.9, -0.24]],
    ["ring", "#11131c", [0.36, 0.36, 0.36], [0, 0.36, 0.55]],
    ["ring", "#11131c", [0.36, 0.36, 0.36], [0, 0.36, -0.55]],
  ],
  boat: [
    ["box", "#f5f0ff", [2.4, 1, 6], [0, 0.5, 0]],
    ["box", "#2a4b8d", [1.8, 1.1, 2.2], [0, 1.5, -0.6]],
    ["box", "#ffd166", [2.5, 0.2, 6.1], [0, 1, 0]],
  ],
  car: [
    ["box", "paint", [1.9, 0.64, 4.1], [0, 0.66, 0]],
    ["box", "#11131c", [1.96, 0.18, 4.16], [0, 0.34, 0]],
    ["box", "#22314a", [1.66, 0.56, 2.1], [0, 1.24, -0.25]],
    ["box", "paint", [1.72, 0.08, 2], [0, 1.54, -0.25]],
    ["box", "#fff6c8", [0.42, 0.18, 0.05], [0.6, 0.74, 2.06]],
    ["box", "#fff6c8", [0.42, 0.18, 0.05], [-0.6, 0.74, 2.06]],
    ["box", "#ff3b3b", [0.42, 0.14, 0.05], [0.6, 0.78, -2.06]],
    ["box", "#ff3b3b", [0.42, 0.14, 0.05], [-0.6, 0.78, -2.06]],
    ...wheels(0.95, 0.4, 1.3, 0.4, 0.3),
  ],
  heli: [
    ["ball", "#ff5d5d", [1.3, 1.1, 1.8], [0, 1.3, 0]],
    ["box", "#ff5d5d", [0.3, 0.3, 3.4], [0, 1.5, -2.4]],
    ["box", "#11131c", [0.15, 0.6, 0.15], [0, 2.5, 0]],
    ["box", "#11131c", [2.4, 0.15, 0.6], [0, 0.15, 0]],
  ],
  scooter: [
    ["box", "paint", [0.45, 0.12, 1.4], [0, 0.25, 0]],
    ["box", "#11131c", [0.08, 1, 0.08], [0, 0.75, 0.6]],
    ["box", "#11131c", [0.6, 0.08, 0.08], [0, 1.25, 0.6]],
    ["wheel", "#11131c", [0.2, 0.12, 0.2], [0, 0.2, 0.62]],
    ["wheel", "#11131c", [0.2, 0.12, 0.2], [0, 0.2, -0.62]],
  ],
};

const shapeOf = (shape: Part[0]): BufferGeometry =>
  shape === "ball"
    ? new SphereGeometry(1, 12, 10)
    : shape === "box"
      ? new BoxGeometry(1, 1, 1)
      : shape === "ring"
        ? new TorusGeometry(1, 0.08, 6, 18)
        : new CylinderGeometry(1, 1, 1, 12);
const turnOf = (shape: Part[0]): Euler =>
  new Euler(
    0,
    shape === "ring" ? Math.PI / 2 : 0,
    shape === "wheel" ? Math.PI / 2 : 0,
  );

// A kit as separate meshes (for the one ride under the hero): the painted parts share `paint`, whose colour can be changed.
export function buildKit(
  parts: readonly Part[],
  paint: MeshToonMaterial,
): Group {
  const group = new Group();
  for (const [shape, colour, size, at] of parts) {
    const material =
      colour === "paint"
        ? paint
        : new MeshToonMaterial({ color: colour, gradientMap: toonSteps });
    const mesh = new Mesh(shapeOf(shape), material);
    mesh.scale.set(...size);
    mesh.position.set(...at);
    mesh.rotation.copy(turnOf(shape));
    group.add(mesh);
  }
  return group;
}

// A kit as one geometry with its colours in its vertices (painted parts white, so an instance's colour paints them), for many at once.
export function mergedKit(parts: readonly Part[]): BufferGeometry {
  const pieces = parts.map(([shape, colour, size, at]) => {
    const geometry = shapeOf(shape);
    geometry.applyMatrix4(
      new Matrix4().compose(
        new Vector3(...at),
        new Quaternion().setFromEuler(turnOf(shape)),
        new Vector3(...size),
      ),
    );
    const tint = colour === "paint" ? [1, 1, 1] : hexToLinear(colour);
    const count = geometry.getAttribute("position").count;
    geometry.setAttribute(
      "color",
      new Float32BufferAttribute(
        Array.from({ length: count }, () => tint).flat(),
        3,
      ),
    );
    return geometry;
  });
  return mergeGeometries(pieces) ?? new BoxGeometry(1, 1, 1);
}

const hexToLinear = (hex: string): number[] => {
  const value = Number.parseInt(hex.slice(1), 16);
  return [16, 8, 0].map((shift) => {
    const channel = ((value >> shift) & 255) / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
};
