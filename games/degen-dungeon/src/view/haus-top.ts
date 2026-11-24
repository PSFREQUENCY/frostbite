import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  SphereGeometry,
  type MeshBasicMaterial,
  type MeshToonMaterial,
} from "three";

import { haus, hoverPad, penthouseFloor, topFloor } from "../rules/haus.ts";

// The top of Haus De Savage (`haus-floors.ts` builds the floors below with the same tools): the penthouse on the twentieth floor, walled
// in glass, with a bed, a sofa and the hover car's pad held out west with a ring of light; and the roof, a crown of deck with its rail and
// edge, the pool, the Canopy's glass pavilion with its tables, the helicopter's pad and, over it all, a canopy of great glowing leaves,
// which is handed back to sway.
export interface Kit {
  disc(
    radius: number,
    y: number,
    x?: number,
    z?: number,
    material?: MeshToonMaterial,
  ): Mesh;
  fence(radius: number, y: number, x?: number, z?: number): void;
  glass(color: string, opacity: number): MeshBasicMaterial;
  put<T extends Mesh>(mesh: T, x: number, y: number, z: number): T;
  ring(radius: number, y: number, color: string, x?: number, z?: number): void;
  readonly storey: number;
  toon(color: string): MeshToonMaterial;
  readonly water: MeshBasicMaterial;
}

export function buildTop({
  disc,
  fence,
  glass,
  put,
  ring,
  storey,
  toon,
  water,
}: Kit): Group {
  const [px, pz] = [(hoverPad.x - haus.x) / 100, (hoverPad.z - haus.z) / 100];
  // The penthouse: walled in glass, a bed, a sofa, and the hover car's pad held out west with its ring of light.
  const top = penthouseFloor * storey;
  disc(13, top);
  put(
    new Mesh(
      new CylinderGeometry(12.6, 12.6, 3.6, 48, 1, true),
      glass("#ffe9c2", 0.2),
    ),
    0,
    top + 1.8,
    0,
  );
  ring(13, top + 0.02, "#ffd166");
  put(
    new Mesh(new BoxGeometry(2.2, 0.5, 2.6), toon("#f4f1ea")),
    4.8,
    top + 0.3,
    -7.4,
  );
  put(
    new Mesh(new BoxGeometry(1.8, 0.25, 0.5), toon("#c9b6ff")),
    4.8,
    top + 0.65,
    -8.4,
  );
  put(
    new Mesh(new BoxGeometry(2.8, 0.7, 1), toon("#5d3fd3")),
    -3.5,
    top + 0.35,
    -6.5,
  );
  disc(6, top, px, pz, toon("#2a2f45"));
  ring(4.6, top + 0.03, "#38e8ff", px, pz);
  // The roof: a crown of deck, its rail and edge, the pool, the Canopy and the helicopter's pad.
  const roof = topFloor * storey;
  disc(17, roof);
  fence(17, roof);
  ring(17, roof + 0.02, "#ff3df2");
  const pool = put(
    new Mesh(new CylinderGeometry(3.4, 3.4, 0.25, 32), water),
    10,
    roof + 0.05,
    -5,
  );
  pool.name = "haus-pool";
  ring(3.5, roof + 0.1, "#f4f8ff", 10, -5);
  put(
    new Mesh(
      new CylinderGeometry(3.6, 3.6, 3, 32, 1, true),
      glass("#ffe9c2", 0.25),
    ),
    -10,
    roof + 1.5,
    -5,
  );
  put(
    new Mesh(new CylinderGeometry(4, 4, 0.2, 32), toon("#2a2350")),
    -10,
    roof + 3.1,
    -5,
  );
  for (const [tx, tz] of [
    [-11.5, -4],
    [-8.6, -6.2],
    [-9.6, -3],
  ] as const) {
    put(
      new Mesh(new CylinderGeometry(0.6, 0.6, 0.08, 12), toon("#f4f1ea")),
      tx,
      roof + 0.8,
      tz,
    );
    put(
      new Mesh(new CylinderGeometry(0.06, 0.06, 0.8, 6), toon("#c9ced6")),
      tx,
      roof + 0.4,
      tz,
    );
  }
  disc(4, roof + 0.05, 0, 14, toon("#3a3f47"));
  ring(3.2, roof + 0.12, "#ffd166", 0, 14);
  // The canopy's leaves, each a great glowing disc tilted out over the edge.
  const canopy = new Group();
  canopy.name = "haus-canopy";
  for (let leaf = 0; leaf < 12; leaf += 1) {
    const angle = (leaf * Math.PI * 2) / 12;
    const blade = new Mesh(
      new SphereGeometry(4.2, 12, 6),
      glass(leaf % 2 === 0 ? "#7be36b" : "#ffd166", 0.35),
    );
    blade.scale.set(1, 0.12, 0.6);
    blade.position.set(
      Math.sin(angle) * 16,
      roof + 5 + (leaf % 3),
      Math.cos(angle) * 16,
    );
    blade.rotation.set(0.3, angle, 0);
    canopy.add(blade);
  }
  return canopy;
}
