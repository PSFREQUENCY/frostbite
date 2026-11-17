import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshToonMaterial,
  SphereGeometry,
  type BufferGeometry,
  type Material,
} from "three";

import { painted } from "./boards.ts";
import { toonSteps } from "./textures.ts";

// A lot's own frame for building a landmark in (`venue-kits.ts`): `u` across the lot from its west side (0 to 42 metres), `w` in from
// the back of the lot toward the street it faces (42 is the pavement), `y` up.
export interface Frame {
  // Adds a box, a column, a ball or a cone (centre, size, colour; `lit` glows at night and always shines).
  readonly box: (
    u: number,
    w: number,
    y: number,
    size: readonly [number, number, number],
    colour: string,
    lit?: boolean,
  ) => Mesh;
  readonly shape: (
    kind: "ball" | "cone" | "post",
    u: number,
    w: number,
    y: number,
    size: readonly [number, number, number],
    colour: string,
    lit?: boolean,
  ) => Mesh;
  // The name over the front, at height `y`.
  readonly sign: (name: string, y: number, ink: string, width?: number) => void;
}

// A frame for one lot, adding to `group`. Glowing parts are collected so the night can brighten them.
export function frameFor(
  group: Group,
  x0: number,
  z0: number,
  front: 1 | -1,
  glows: Material[],
): Frame {
  const toX = (u: number): number => x0 + u;
  const toZ = (w: number): number => (front === 1 ? z0 + w : z0 + 42 - w);
  const material = (colour: string, lit: boolean): Material => {
    if (!lit)
      return new MeshToonMaterial({ color: colour, gradientMap: toonSteps });
    const glow = new MeshBasicMaterial({ color: colour });
    glows.push(glow);
    return glow;
  };
  const add = (
    geometry: BufferGeometry,
    u: number,
    w: number,
    y: number,
    size: readonly [number, number, number],
    colour: string,
    lit: boolean,
  ): Mesh => {
    const mesh = new Mesh(geometry, material(colour, lit));
    mesh.position.set(toX(u), y, toZ(w));
    mesh.scale.set(...size);
    group.add(mesh);
    return mesh;
  };
  return {
    box: (u, w, y, size, colour, lit = false) =>
      add(new BoxGeometry(1, 1, 1), u, w, y, size, colour, lit),
    shape: (kind, u, w, y, size, colour, lit = false) =>
      add(
        kind === "ball"
          ? new SphereGeometry(1, 16, 12)
          : kind === "cone"
            ? new ConeGeometry(1, 1, 16)
            : new CylinderGeometry(1, 1, 1, 12),
        u,
        w,
        y,
        size,
        colour,
        lit,
      ),
    sign(name, y, ink, width = 16) {
      const board = new Mesh(
        new BoxGeometry(width, width / 2.7, 0.3),
        painted(name, ink),
      );
      board.position.set(toX(21), y, toZ(42.4));
      board.rotation.y = front === 1 ? 0 : Math.PI;
      group.add(board);
    },
  };
}

// A lookout post: four legs, a platform with a rail, and a roof, high enough to see over the low buildings.
export function buildLookout(frame: Frame, u: number, w: number): void {
  for (const [du, dw] of [
    [-1.6, -1.6],
    [1.6, -1.6],
    [-1.6, 1.6],
    [1.6, 1.6],
  ] as const)
    frame.shape("post", u + du, w + dw, 6, [0.2, 12, 0.2], "#8a6a4a");
  frame.box(u, w, 12, [4.4, 0.3, 4.4], "#8a6a4a");
  frame.box(u, w, 12.7, [4.4, 1, 4.4], "#c9a46a").material =
    new MeshBasicMaterial({
      color: "#c9a46a",
      opacity: 0.5,
      transparent: true,
    });
  frame.shape("cone", u, w, 15, [3.6, 2.4, 3.6], "#d64545");
}
