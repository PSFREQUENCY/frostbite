import {
  BoxGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Shape,
  TorusGeometry,
} from "three";

import { venues } from "../rules/venues.ts";
import { painted } from "./boards.ts";

// The Global DEX (`rules/venues.ts`, where it is "bank"): the island's temple of money, built like a fortress. Its round gold-domed hall
// stands on a granite podium a metre high, fronted by a portico of eight tall columns under a pediment and the name in gold, with a
// vault door the size of a truck standing open in the doorway; broad steps run down to the street, where the riot packs in on the
// first morning and Frost speaks from the steps. `podiumAt` is the ground the steps and the podium make (metres), for everyone who
// walks there.
const dex = venues.find(({ kind }) => kind === "bank");
const lot = dex?.lot ?? { x0: 12_800, x1: 17_000, z0: 19_000, z1: 23_200 };
const front = lot.z0 / 100;
const [west, east] = [lot.x0 / 100, lot.x1 / 100];
const mid = (west + east) / 2;
export const podium = 1;
const rise = 0.25;
const stairs = { x0: west + 5, x1: east - 5, z0: front - 4 };

// The ground on the Global DEX's steps and podium (metres above the street), or null off them.
export function podiumAt(x: number, z: number): number | null {
  if (x >= west && x <= east && z >= front && z <= lot.z1 / 100) return podium;
  if (x < stairs.x0 || x > stairs.x1 || z < stairs.z0 || z >= front)
    return null;
  return Math.min(podium, rise * (Math.floor(z - stairs.z0) + 1));
}

export function buildDex(): Group {
  const root = new Group();
  root.name = "global-dex";
  const granite = new MeshStandardMaterial({
    color: "#d9d4c6",
    roughness: 0.85,
  });
  const dark = new MeshStandardMaterial({ color: "#b8b1a0", roughness: 0.9 });
  const gold = new MeshStandardMaterial({
    color: "#e0b341",
    emissive: "#7a5a10",
    emissiveIntensity: 0.25,
    metalness: 0.9,
    roughness: 0.3,
  });
  const box = (
    x0: number,
    x1: number,
    y0: number,
    y1: number,
    z0: number,
    z1: number,
    material: MeshStandardMaterial,
  ): Mesh => {
    const mesh = new Mesh(new BoxGeometry(x1 - x0, y1 - y0, z1 - z0), material);
    mesh.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
    return mesh;
  };
  box(west, east, 0, podium, front, lot.z1 / 100, granite);
  for (let step = 1; step <= podium / rise; step += 1)
    box(
      stairs.x0,
      stairs.x1,
      0,
      rise * step,
      stairs.z0 + step - 1,
      front,
      step % 2 === 0 ? granite : dark,
    );
  // The portico: eight columns with bases and capitals, the wall behind them with its great doorway, the entablature and pediment.
  const top = podium + 14;
  const columns = 8;
  for (let index = 0; index < columns; index += 1) {
    const x =
      stairs.x0 + 1.5 + ((stairs.x1 - stairs.x0 - 3) * index) / (columns - 1);
    const column = new Mesh(
      new CylinderGeometry(0.75, 0.85, top - podium - 1, 16),
      granite,
    );
    column.position.set(x, (top + podium) / 2, front + 1.1);
    column.castShadow = true;
    root.add(column);
    box(x - 1, x + 1, podium, podium + 0.5, front + 0.1, front + 2.1, dark);
    box(x - 1, x + 1, top - 0.5, top, front + 0.1, front + 2.1, dark);
  }
  const back = front + 2.4;
  box(stairs.x0, mid - 3.2, podium, top, back, back + 0.6, granite);
  box(mid + 3.2, stairs.x1, podium, top, back, back + 0.6, granite);
  box(mid - 3.2, mid + 3.2, podium + 8.5, top, back, back + 0.6, granite);
  const beam = box(
    stairs.x0 - 0.5,
    stairs.x1 + 0.5,
    top,
    top + 2.2,
    front - 0.2,
    back + 0.6,
    granite,
  );
  beam.name = "dex-entablature";
  const name = new Mesh(
    new BoxGeometry(18, 1.6, 0.1),
    painted("GLOBAL DEX", "#ffd166"),
  );
  name.position.set(mid, top + 1.1, front - 0.3);
  root.add(name);
  const gable = new Shape();
  const half = (stairs.x1 - stairs.x0) / 2 + 0.5;
  gable.moveTo(-half, 0);
  gable.lineTo(half, 0);
  gable.lineTo(0, 5);
  gable.closePath();
  const pediment = new Mesh(
    new ExtrudeGeometry(gable, {
      bevelEnabled: false,
      depth: back + 0.6 - front + 0.2,
    }),
    granite,
  );
  pediment.position.set(mid, top + 2.2, front - 0.2);
  pediment.castShadow = true;
  root.add(pediment);
  // The vault door, a disc of gold and steel with its wheel, swung open beside the doorway on its hinge.
  const vault = new Group();
  vault.name = "dex-vault";
  const disc = new Mesh(new CylinderGeometry(3.4, 3.4, 0.8, 48), gold);
  disc.rotation.x = Math.PI / 2;
  const wheel = new Mesh(new TorusGeometry(1.4, 0.16, 10, 32), dark);
  wheel.position.z = -0.5;
  vault.add(disc, wheel);
  for (const turn of [0, Math.PI / 3, (2 * Math.PI) / 3]) {
    const spoke = new Mesh(new BoxGeometry(3, 0.2, 0.2), dark);
    spoke.rotation.z = turn;
    spoke.position.z = -0.5;
    vault.add(spoke);
  }
  const hinge = new Group();
  hinge.position.set(mid + 3.2, podium + 4, back - 0.2);
  vault.position.set(-3.4, 0, 0);
  hinge.add(vault);
  hinge.rotation.y = 1.35;
  root.add(hinge);
  return root;
}
