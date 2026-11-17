import {
  BoxGeometry,
  CylinderGeometry,
  Mesh,
  MeshToonMaterial,
  SphereGeometry,
  type BufferGeometry,
  type Group,
} from "three";

import { toonSteps } from "./textures.ts";

// The nine statues' masks, by statue (the rules' `statues.ts` order): every one a plate over the face with two eye slits, and each with
// a mark of its own: a gold visor stripe, a fin, nothing at all (the Ice Runner's blank white), a mirror visor, a bull's horns, a grin,
// woven stripes, a miner's lamp, and a sunburst of rays. A part is a shape, its colour, its size, where it sits and how it turns, all in
// units of the head's radius from the head's middle (the face looks along +z).
export type MaskKind =
  | "fin"
  | "grin"
  | "horns"
  | "lamp"
  | "mirror"
  | "plain"
  | "rays"
  | "visor"
  | "weave";
type Triple = readonly [number, number, number];
export type MaskPart = readonly [
  shape: "ball" | "box" | "post",
  colour: string,
  size: Triple,
  at: Triple,
  turn: Triple,
];

export const masks: readonly {
  readonly detail: string;
  readonly kind: MaskKind;
  readonly plate: string;
}[] = [
  { detail: "#ffd166", kind: "visor", plate: "#1f2f5c" },
  { detail: "#5beac6", kind: "fin", plate: "#2aa198" },
  { detail: "#9ad7ff", kind: "plain", plate: "#f4f8ff" },
  { detail: "#ff3df2", kind: "mirror", plate: "#0b0b14" },
  { detail: "#fff1b8", kind: "horns", plate: "#e2b042" },
  { detail: "#11131c", kind: "grin", plate: "#ff8a5b" },
  { detail: "#ffd166", kind: "weave", plate: "#c0392b" },
  { detail: "#fff6c8", kind: "lamp", plate: "#4a4f58" },
  { detail: "#ff9a3c", kind: "rays", plate: "#ffd166" },
];

const flat: Triple = [0, 0, 0];
export function maskParts(index: number): readonly MaskPart[] {
  const mask = masks[index] ??
    masks[2] ?? { detail: "#ffffff", kind: "plain", plate: "#ffffff" };
  const { detail, kind, plate } = mask;
  const slit = kind === "mirror" ? plate : "#11131c";
  const parts: MaskPart[] = [
    ["ball", plate, [1.9, 2.1, 1.24], [0, 0, 0.5], flat],
    ["box", slit, [0.34, 0.08, 0.12], [-0.36, 0.2, 1.1], [0, 0, -0.12]],
    ["box", slit, [0.34, 0.08, 0.12], [0.36, 0.2, 1.1], [0, 0, 0.12]],
  ];
  if (kind === "visor")
    parts.push(["box", detail, [1.9, 0.16, 0.2], [0, 0.2, 1.1], flat]);
  if (kind === "fin")
    parts.push([
      "box",
      detail,
      [0.12, 0.7, 0.9],
      [0, 1.05, -0.1],
      [-0.4, 0, 0],
    ]);
  if (kind === "mirror")
    parts.push(
      ["ball", "#2b2b40", [1.7, 0.8, 1.1], [0, 0.15, 0.62], flat],
      ["box", detail, [1.9, 0.05, 0.15], [0, -0.15, 1.1], flat],
    );
  if (kind === "horns")
    for (const side of [-1, 1])
      parts.push([
        "post",
        detail,
        [0.18, 0.75, 0.18],
        [side * 0.8, 0.8, 0.1],
        [0, 0, side * -0.7],
      ]);
  if (kind === "grin")
    parts.push(
      ["box", detail, [0.9, 0.12, 0.12], [0, -0.4, 1.08], flat],
      ["box", detail, [0.2, 0.1, 0.12], [-0.5, -0.32, 1.04], [0, 0, -0.6]],
      ["box", detail, [0.2, 0.1, 0.12], [0.5, -0.32, 1.04], [0, 0, 0.6]],
    );
  if (kind === "weave")
    for (const y of [-0.38, -0.1, 0.48])
      parts.push(["box", detail, [1.7, 0.08, 0.12], [0, y, 1.08], flat]);
  if (kind === "lamp")
    parts.push(
      ["post", plate, [0.34, 0.26, 0.34], [0, 0.78, 0.98], [Math.PI / 2, 0, 0]],
      ["ball", detail, [0.2, 0.2, 0.08], [0, 0.78, 1.12], flat],
    );
  if (kind === "rays")
    for (let ray = 0; ray < 8; ray += 1) {
      const angle = (ray / 8) * Math.PI * 2;
      parts.push([
        "box",
        detail,
        [0.12, 0.45, 0.08],
        [Math.cos(angle) * 1.15, Math.sin(angle) * 1.15, 0.45],
        [0, 0, angle - Math.PI / 2],
      ]);
    }
  return parts;
}

// Puts a mask on a head of radius `r` (metres) that faces along +z.
export function wearMask(head: Group, index: number, r: number): void {
  for (const [shape, colour, size, at, turn] of maskParts(index)) {
    const piece = new Mesh(
      shapeGeometry(shape),
      new MeshToonMaterial({ color: colour, gradientMap: toonSteps }),
    );
    piece.scale.set(size[0] * r, size[1] * r, size[2] * r);
    piece.position.set(at[0] * r, at[1] * r, at[2] * r);
    piece.rotation.set(...turn);
    head.add(piece);
  }
}

// A shape at the size of a unit box (a ball and a post one across).
export const shapeGeometry = (shape: MaskPart[0]): BufferGeometry =>
  shape === "ball"
    ? new SphereGeometry(0.5, 14, 10)
    : shape === "box"
      ? new BoxGeometry(1, 1, 1)
      : new CylinderGeometry(0.5, 0.5, 1, 12);
