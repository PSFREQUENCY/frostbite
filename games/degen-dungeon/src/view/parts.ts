import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  Mesh,
  SphereGeometry,
  TorusGeometry,
  type Group,
} from "three";

import { paint } from "./body.ts";

type Triple = readonly [number, number, number];
// What sits on each kind of head: horns, ears, snouts, hats, a lamp, a mane. Each part is a small primitive placed by the head's size.
export function part(
  head: Group,
  shape: "ball" | "box" | "cone" | "ring" | "rod",
  colour: string,
  size: Triple,
  at: Triple,
  turn: Triple = [0, 0, 0],
  glow = false,
): Mesh {
  const geometry =
    shape === "ball"
      ? new SphereGeometry(1, 10, 8)
      : shape === "box"
        ? new BoxGeometry(1, 1, 1)
        : shape === "cone"
          ? new ConeGeometry(1, 1, 8)
          : shape === "ring"
            ? new TorusGeometry(1, 0.3, 6, 14, Math.PI * 1.4)
            : new CylinderGeometry(1, 1, 1, 10);
  const mesh = new Mesh(geometry, paint(colour, glow));
  mesh.scale.set(...size);
  mesh.position.set(...at);
  mesh.rotation.set(...turn);
  head.add(mesh);
  return mesh;
}

export const both = (make: (side: number) => void): void => {
  make(-1);
  make(1);
};
