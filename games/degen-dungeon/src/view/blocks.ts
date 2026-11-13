import {
  BoxGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Quaternion,
  SphereGeometry,
  Vector3,
  type BufferGeometry,
  type Group,
} from "three";

import { block, lots } from "../rules/constants.ts";

// The buildings and trees of the nine boroughs, built from the rules' lots: New York towers in Neon Row and The Exchange, Los Angeles
// stucco and palms on the marina and the boardwalk, Philadelphia brick in Cold Harbor, Rug Row and Gig Street, sheds and head frames in
// The Shaft, and the Old Floe mostly park. Each kind of thing is one instanced mesh, so the whole city is a handful of draws.
interface Style {
  readonly colours: readonly string[];
  readonly glow: string | null;
  readonly high: number;
  readonly low: number;
  readonly rows: number;
  readonly trees: "palm" | "pine" | null;
}
const style = (
  colours: readonly string[],
  low: number,
  high: number,
  rows: number,
  glow: string | null = null,
  trees: Style["trees"] = null,
): Style => ({ colours, glow, high, low, rows, trees });
const styles: readonly Style[] = [
  style(["#7a3b2e", "#8c4a36", "#5e3a2f"], 8, 16, 2, null),
  style(["#f3e3c3", "#f7c6a3", "#cfe8e0"], 6, 12, 2, null, "palm"),
  style(["#dfe9f2", "#c9d7e3"], 4, 8, 1, null, "pine"),
  style(["#1d1b33", "#2a2350", "#14122a"], 30, 70, 2, "#ff3df2"),
  style(["#21405f", "#2c5b86", "#1b2f47"], 40, 110, 2, "#5beac6"),
  style(["#ff8a5b", "#ffd166", "#5beac6", "#ff9ecf"], 4, 9, 3, null, "palm"),
  style(["#8c3b2e", "#a14a35", "#6e2f26"], 9, 12, 4, "#ffd166"),
  style(["#4a4f58", "#5d6470", "#3a3f47"], 10, 22, 2, "#ffb000"),
  style(["#9a4a32", "#b0603e", "#7d3d2b"], 12, 24, 3, "#ff9a3c", "pine"),
];

// A number in [0, 1) that is the same every time for the same three whole numbers.
export const hash = (a: number, b: number, c: number): number => {
  let mixed = Math.imul(a + 1, 0x9e_37_79_b1) ^ Math.imul(b + 7, 0x85_eb_ca_6b);
  mixed = Math.imul(mixed ^ (c + 13), 0xc2_b2_ae_35);
  return ((mixed ^ (mixed >>> 15)) >>> 0) / 0x1_0000_0000;
};

interface Piece {
  readonly colour: string;
  readonly matrix: Matrix4;
}
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

function instanced(
  name: string,
  geometry: BufferGeometry,
  material: MeshBasicMaterial | MeshStandardMaterial,
  pieces: readonly Piece[],
): InstancedMesh {
  const mesh = new InstancedMesh(
    geometry,
    material,
    Math.max(1, pieces.length),
  );
  mesh.name = name;
  mesh.count = pieces.length;
  pieces.forEach((piece, index) => {
    mesh.setMatrixAt(index, piece.matrix);
    mesh.setColorAt(index, new Color(piece.colour));
  });
  mesh.castShadow = name === "towers";
  mesh.receiveShadow = true;
  return mesh;
}

export function buildBlocks(city: Group): void {
  const towers: Piece[] = [];
  const glows: Piece[] = [];
  const trunks: Piece[] = [];
  const crowns: Piece[] = [];
  const pines: Piece[] = [];
  styles.forEach((look, borough) => {
    const left = (block * (borough % 3)) / 100;
    const top = (block * Math.floor(borough / 3)) / 100;
    lots.forEach(([west, east], column) =>
      lots.forEach(([north, south], row) => {
        const lot = column * 2 + row;
        if (borough === 2 && lot !== 3) return;
        const span = (east - west) / 100 / look.rows;
        const deep = (south - north) / 100 / look.rows;
        for (let i = 0; i < look.rows; i += 1)
          for (let j = 0; j < look.rows; j += 1) {
            const roll = hash(borough, lot, i * 7 + j);
            const height = look.low + (look.high - look.low) * roll;
            const x = left + west / 100 + span * (i + 0.5);
            const z = top + north / 100 + deep * (j + 0.5);
            const colour =
              look.colours[Math.floor(roll * 97) % look.colours.length] ??
              "#888888";
            towers.push({
              colour,
              matrix: box(x, height / 2, z, span * 0.86, height, deep * 0.86),
            });
            if (look.glow !== null && roll > 0.35)
              for (let floor = 4; floor < height - 2; floor += 6)
                glows.push({
                  colour: look.glow,
                  matrix: box(x, floor, z, span * 0.88, 0.5, deep * 0.88),
                });
          }
      }),
    );
    if (look.trees === null) return;
    for (let k = 0; k < 14; k += 1) {
      const along = (k % 7) * 16 + 8;
      const side = k < 7 ? 51.5 : 68.5;
      const x = left + (k % 2 === 0 ? along : side);
      const z = top + (k % 2 === 0 ? side : along);
      if (look.trees === "palm") {
        trunks.push({ colour: "#8a6a4a", matrix: box(x, 4, z, 0.5, 8, 0.5) });
        crowns.push({
          colour: "#3fae6b",
          matrix: box(x, 8.5, z, 3.2, 1.2, 3.2),
        });
      } else
        pines.push({
          colour: k % 3 === 0 ? "#e8f6ff" : "#2f6f57",
          matrix: box(x, 3, z, 2.6, 6, 2.6),
        });
    }
  });
  const flat = () =>
    new MeshStandardMaterial({
      color: "#ffffff",
      flatShading: true,
      roughness: 0.8,
    });
  city.add(
    instanced("towers", new BoxGeometry(1, 1, 1), flat(), towers),
    instanced(
      "windows",
      new BoxGeometry(1, 1, 1),
      new MeshBasicMaterial({ color: "#ffffff" }),
      glows,
    ),
    instanced("trunks", new CylinderGeometry(0.5, 0.5, 1, 6), flat(), trunks),
    instanced("palms", new SphereGeometry(0.5, 8, 6), flat(), crowns),
    instanced("pines", new ConeGeometry(0.5, 1, 7), flat(), pines),
  );
}
