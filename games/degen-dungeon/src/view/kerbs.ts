import { Matrix4, Quaternion, Vector3 } from "three";

import { block, lots } from "../rules/constants.ts";
import { rooms } from "../rules/rooms.ts";
import { hash } from "./hash.ts";

// Places along the pavements, for the street furniture and the posters: every `step` metres down each side of every lot.
const turned = new Quaternion();
const up = new Vector3(0, 1, 0);
const at = new Vector3();
const size = new Vector3();
export const turnedBox = (
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  turn: number,
): Matrix4 =>
  new Matrix4().compose(
    at.set(x, y, z),
    turned.setFromAxisAngle(up, turn),
    size.set(w, h, d),
  );

// A spot on the pavement `out` metres from a lot's side, `along` metres down it, and the way it faces (toward the street).
export interface Kerb {
  readonly turn: number;
  readonly x: number;
  readonly z: number;
}
export function kerbs(step: number, out: number, salt: number): Kerb[] {
  const found: Kerb[] = [];
  for (let borough = 0; borough < 9; borough += 1) {
    const left = (block * (borough % 3)) / 100;
    const top = (block * Math.floor(borough / 3)) / 100;
    for (const [north, south] of lots)
      for (const [west, east] of lots) {
        const [x0, x1, z0, z1] = [
          left + west / 100,
          left + east / 100,
          top + north / 100,
          top + south / 100,
        ];
        for (
          let along = step / 2 + hash(borough, salt, west) * 4;
          along < 42 - 2;
          along += step
        ) {
          found.push(
            { turn: Math.PI, x: x0 + along, z: z0 - out },
            { turn: 0, x: x0 + along, z: z1 + out },
            { turn: -Math.PI / 2, x: x0 - out, z: z0 + along },
            { turn: Math.PI / 2, x: x1 + out, z: z0 + along },
          );
        }
      }
  }
  // Nothing stands in a shop's doorway.
  return found.filter(
    (kerb) =>
      !rooms.some(
        ({ door }) =>
          Math.abs(kerb.x - (door.x0 + door.x1) / 200) < 2.5 &&
          Math.abs(kerb.z - (door.z0 + door.z1) / 200) < 4,
      ),
  );
}
