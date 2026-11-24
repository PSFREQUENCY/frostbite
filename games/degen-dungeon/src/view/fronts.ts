import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshToonMaterial,
  PlaneGeometry,
  Quaternion,
  Vector3,
} from "three";

import { rooms } from "../rules/rooms.ts";
import { spotNamed } from "../rules/places.ts";
import { painted } from "./boards.ts";
import { box } from "./hash.ts";
import { frameOf, front } from "./shops.ts";
import { toonSteps } from "./textures.ts";

// What stands in front of the shops: at every Silky a forecourt over the pavement, its canopy on two columns with a lit red edge and
// lights underneath, two pumps on an island with their screens and hoses, and a pole sign with the day's gas in gwei; and the ID kiosk,
// a photo booth with a curtain, a lit sign and a flash. They read nothing and decide nothing.
export interface Fronts {
  readonly root: Group;
}

export function buildFronts(): Fronts {
  const root = new Group();
  root.name = "fronts";
  const solid: (readonly [Matrix4, string])[] = [];
  const glow: (readonly [Matrix4, string])[] = [];
  for (const room of rooms.filter(({ kind }) => kind === "gas")) {
    const { toX, toZ } = frameOf(room);
    const put = (
      u: number,
      w: number,
      y: number,
      width: number,
      height: number,
      deep: number,
      colour: string,
      lit = false,
    ): void => {
      (lit ? glow : solid).push([
        box(toX(u), y, toZ(w), width, height, deep),
        colour,
      ]);
    };
    const out = front + 3.6;
    put(5.6, out, 4.9, 10.6, 0.45, 6.4, "#f4f8ff");
    put(5.6, out, 4.62, 10.4, 0.1, 6.2, "#fff6d8", true);
    put(5.6, out - 3.22, 4.95, 10.7, 0.32, 0.06, "#e63946", true);
    put(5.6, out + 3.22, 4.95, 10.7, 0.32, 0.06, "#e63946", true);
    for (const u of [1.6, 9.6])
      put(u, out + 1.8, 2.35, 0.5, 4.7, 0.5, "#c9ced8");
    put(5.6, out + 0.6, 0.12, 7.4, 0.24, 1.4, "#8a93a6");
    for (const u of [3.4, 7.8]) {
      put(u, out + 0.6, 0.95, 0.8, 1.5, 0.5, "#e63946");
      put(u, out + 0.33, 1.25, 0.6, 0.35, 0.04, "#5beac6", true);
      put(u, out + 0.87, 1.25, 0.6, 0.35, 0.04, "#5beac6", true);
      put(u + 0.45, out + 0.6, 1.1, 0.08, 0.8, 0.08, "#11131c");
    }
    put(11.2, out + 2.6, 3.2, 0.25, 6.4, 0.25, "#8a93a6");
    const sign = new Mesh(
      new BoxGeometry(2.4, 1.5, 0.3),
      painted("GAS 21 GWEI", "#ffd166"),
    );
    sign.position.set(toX(11.2), 6.8, toZ(out + 2.6));
    sign.rotation.y = room.north ? Math.PI : 0;
    sign.name = `gas-sign-${room.id}`;
    root.add(sign);
  }
  // The ID kiosk: a booth with a curtained doorway facing the street, a lit sign and a camera's flash.
  const kiosk = spotNamed("id-kiosk");
  if (kiosk !== undefined) {
    const x = kiosk.x / 100 + 1.2;
    const z = kiosk.z / 100 - 1.2;
    solid.push([box(x, 1.15, z, 1.4, 2.3, 1.1), "#2f6fb5"]);
    solid.push([box(x, 1.05, z + 0.56, 0.9, 1.7, 0.04), "#ffd166"]);
    glow.push([box(x, 2.45, z + 0.3, 1.2, 0.35, 0.5), "#f4f8ff"]);
    glow.push([box(x - 0.45, 1.75, z + 0.57, 0.18, 0.18, 0.03), "#fff6d8"]);
    const label = new Mesh(
      new PlaneGeometry(1.1, 0.3),
      painted("NAKASATO ID", "#2f6fb5"),
    );
    label.position.set(x, 2.45, z + 0.56);
    label.name = "id-kiosk";
    root.add(label);
  }
  const mesh = (
    name: string,
    material: MeshToonMaterial | MeshBasicMaterial,
    pieces: readonly (readonly [Matrix4, string])[],
  ): InstancedMesh => {
    const made = new InstancedMesh(
      new BoxGeometry(1, 1, 1),
      material,
      Math.max(1, pieces.length),
    );
    made.name = name;
    pieces.forEach(([matrix, colour], index) => {
      made.setMatrixAt(index, matrix);
      made.setColorAt(index, new Color(colour));
    });
    return made;
  };
  root.add(
    mesh(
      "front-parts",
      new MeshToonMaterial({ color: "#ffffff", gradientMap: toonSteps }),
      solid,
    ),
    mesh("front-glow", new MeshBasicMaterial({ color: "#ffffff" }), glow),
  );
  // The hoses, hung in an arc from each pump.
  const hose = new CylinderGeometry(0.025, 0.025, 1.2, 6);
  const hoses = new InstancedMesh(
    hose,
    new MeshToonMaterial({ color: "#11131c", gradientMap: toonSteps }),
    12,
  );
  hoses.name = "hoses";
  let index = 0;
  const turn = new Quaternion();
  for (const room of rooms.filter(({ kind }) => kind === "gas"))
    for (const u of [3.4, 7.8]) {
      const { toX, toZ } = frameOf(room);
      turn.setFromAxisAngle(new Vector3(0, 0, 1), 0.5);
      hoses.setMatrixAt(
        index,
        new Matrix4().compose(
          new Vector3(toX(u + 0.55), 0.85, toZ(front + 4.2)),
          turn,
          new Vector3(1, 1, 1),
        ),
      );
      index += 1;
    }
  hoses.count = index;
  root.add(hoses);
  return { root };
}
