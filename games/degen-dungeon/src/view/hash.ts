import { Matrix4, Quaternion, Vector3 } from "three";

// Two small tools every part of the city uses: a number that is the same every time for the same three whole numbers (so the city is
// the same on every visit), and a box's matrix from its centre and size.
export const hash = (a: number, b: number, c: number): number => {
  let mixed = Math.imul(a + 1, 0x9e_37_79_b1) ^ Math.imul(b + 7, 0x85_eb_ca_6b);
  mixed = Math.imul(mixed ^ (c + 13), 0xc2_b2_ae_35);
  return ((mixed ^ (mixed >>> 15)) >>> 0) / 0x1_0000_0000;
};

const place = new Vector3();
const upright = new Quaternion();
const extent = new Vector3();
// A box's matrix from its centre and size in metres.
export const box = (
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
): Matrix4 =>
  new Matrix4().compose(place.set(x, y, z), upright, extent.set(w, h, d));
