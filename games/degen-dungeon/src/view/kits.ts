import {
  BoxGeometry,
  CapsuleGeometry,
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
  shape: "ball" | "box" | "pill" | "post" | "ring" | "wheel",
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
    ["pill", "#f5f0ff", [2.4, 1.2, 6], [0, 0.5, 0]],
    ["ball", "#2a4b8d", [0.9, 0.7, 1.2], [0, 1.4, -0.6]],
    ["pill", "#ffd166", [2.5, 0.2, 6.1], [0, 1, 0]],
  ],
  car: [
    ["pill", "paint", [1.95, 0.8, 4.2], [0, 0.72, 0]],
    ["pill", "#11131c", [2, 0.3, 4.1], [0, 0.42, 0]],
    ["ball", "#22314a", [0.9, 0.62, 1.3], [0, 1.05, -0.2]],
    ["ball", "#fff6c8", [0.18, 0.12, 0.08], [0.6, 0.8, 2.02]],
    ["ball", "#fff6c8", [0.18, 0.12, 0.08], [-0.6, 0.8, 2.02]],
    ["ball", "#ff3b3b", [0.2, 0.1, 0.08], [0.62, 0.84, -2.02]],
    ["ball", "#ff3b3b", [0.2, 0.1, 0.08], [-0.62, 0.84, -2.02]],
    ...wheels(0.95, 0.4, 1.3, 0.4, 0.3),
  ],
  heli: [
    ["ball", "#ff5d5d", [1.3, 1.1, 1.8], [0, 1.3, 0]],
    ["box", "#ff5d5d", [0.3, 0.3, 3.4], [0, 1.5, -2.4]],
    ["box", "#11131c", [0.15, 0.6, 0.15], [0, 2.5, 0]],
    ["box", "#11131c", [2.4, 0.15, 0.6], [0, 0.15, 0]],
  ],
  moto: [
    ["pill", "paint", [0.46, 0.5, 1.5], [0, 0.78, 0.05]],
    ["ball", "paint", [0.28, 0.2, 0.36], [0, 1.02, 0.32]],
    ["pill", "#11131c", [0.36, 0.14, 0.8], [0, 0.96, -0.32]],
    ["box", "#11131c", [0.7, 0.06, 0.06], [0, 1.18, 0.62]],
    ["ball", "#fff6c8", [0.1, 0.1, 0.06], [0, 0.98, 0.82]],
    ["wheel", "#11131c", [0.34, 0.18, 0.34], [0, 0.34, 0.72]],
    ["wheel", "#11131c", [0.34, 0.18, 0.34], [0, 0.34, -0.72]],
  ],
  semi: [
    ["pill", "paint", [2.5, 1.5, 3], [0, 1.35, 0.7]],
    ["pill", "#22314a", [2.4, 0.95, 2.4], [0, 2.52, 0.9]],
    ["pill", "paint", [2.5, 0.25, 3], [0, 3.1, 0.6]],
    ...posts(1.15, 2.55, 1, [-0.4, 2]),
    ["box", "#c0c6d0", [2, 0.9, 0.08], [0, 1.4, 2.22]],
    ["box", "#11131c", [2.4, 0.4, 2.2], [0, 1, -1.9]],
    ["post", "#c0c6d0", [0.18, 2, 0.18], [1.2, 3.1, -0.6]],
    ...wheels(1.15, 0.55, 1.3, 0.55, 0.45).slice(0, 2),
    ...wheels(1.15, 0.55, 1.6, 0.55, 0.45).slice(2),
    ...wheels(1.15, 0.55, 2.4, 0.55, 0.45).slice(2),
  ],
  truck: [
    ["pill", "paint", [2, 0.8, 2.4], [0, 0.95, 1.05]],
    ["pill", "#22314a", [1.9, 0.62, 2], [0, 1.62, 0.95]],
    ["pill", "paint", [2, 0.1, 2.1], [0, 1.96, 0.95]],
    ...posts(0.92, 1.62, 0.7, [0.05, 1.85]),
    ["box", "paint", [2, 0.75, 2.6], [0, 0.85, -1.35]],
    ["pill", "#11131c", [2.05, 0.3, 5.1], [0, 0.45, -0.1]],
    ...wheels(1, 0.48, 1.55, 0.48, 0.34),
  ],
  van: [
    ["pill", "paint", [2, 1, 4.8], [0, 0.75, 0]],
    ["pill", "#11131c", [2.05, 0.3, 4.7], [0, 0.42, 0]],
    ["pill", "#22314a", [1.96, 0.72, 4], [0, 1.5, -0.1]],
    ["pill", "paint", [2, 0.14, 4.1], [0, 1.9, -0.1]],
    ...posts(0.94, 1.52, 0.8, [-1.95, -0.4, 1.75]),
    ["ball", "#fff6c8", [0.16, 0.12, 0.06], [0.65, 0.95, 2.38]],
    ["ball", "#fff6c8", [0.16, 0.12, 0.06], [-0.65, 0.95, 2.38]],
    ...wheels(0.98, 0.42, 1.55, 0.42, 0.3),
  ],
  scooter: [
    ["pill", "paint", [0.45, 0.14, 1.4], [0, 0.25, 0]],
    ["box", "#11131c", [0.08, 1, 0.08], [0, 0.75, 0.6]],
    ["box", "#11131c", [0.6, 0.08, 0.08], [0, 1.25, 0.6]],
    ["wheel", "#11131c", [0.2, 0.12, 0.2], [0, 0.2, 0.62]],
    ["wheel", "#11131c", [0.2, 0.12, 0.2], [0, 0.2, -0.62]],
  ],
  // The visitors' saucer is their own model (`saucers.ts`), not a kit.
  saucer: [],
};

// Pillars holding a cabin's roof over its glass, on both sides at each place along it.
function posts(
  x: number,
  y: number,
  tall: number,
  along: readonly number[],
): Part[] {
  return along.flatMap((z): Part[] => [
    ["box", "paint", [0.1, tall, 0.12], [x, y, z]],
    ["box", "paint", [0.1, tall, 0.12], [-x, y, z]],
  ]);
}

// Each shape at the size of a unit box: a ball, a box, a pill lying along +z, a ring standing across it, a wheel turning across it.
const shapeOf = (shape: Part[0]): BufferGeometry =>
  shape === "ball"
    ? new SphereGeometry(1, 14, 10)
    : shape === "box"
      ? new BoxGeometry(1, 1, 1)
      : shape === "pill"
        ? new CapsuleGeometry(0.5, 1, 6, 14)
            .rotateX(Math.PI / 2)
            .scale(1, 1, 0.5)
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
// Windows and cabins: tinted glass on a ride the hero is in, so whoever sits inside shows through.
export const glassColour = "#22314a";
const glass = new MeshToonMaterial({
  color: glassColour,
  depthWrite: false,
  gradientMap: toonSteps,
  opacity: 0.38,
  transparent: true,
});

export function buildKit(
  parts: readonly Part[],
  paint: MeshToonMaterial,
): Group {
  const group = new Group();
  for (const [shape, colour, size, at] of parts) {
    const material =
      colour === "paint"
        ? paint
        : colour === glassColour
          ? glass
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
