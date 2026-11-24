import {
  BoxGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Group,
  InstancedMesh,
  Mesh,
  MeshToonMaterial,
  SphereGeometry,
  type BufferGeometry,
  type Matrix4,
} from "three";

import { block } from "../rules/constants.ts";
import { box } from "./hash.ts";
import { buildLot, styles } from "./lots.ts";
import { createShell } from "./shell.ts";
import { facade, shopfronts, toonSteps } from "./textures.ts";

// The buildings and trees of the nine boroughs, built from the rules' lots. Every lot is ringed by low buildings on the pavement, two to
// six floors, many with a little shop on the ground floor (an awning, a sign, a lit window at night); the towers stand back in the middle
// of the lot, so the street feels like a street and the skyline is still there. New York towers in Neon Row and The Exchange, Los Angeles
// stucco and palms on the marina and the boardwalk, Philadelphia brick in Cold Harbor, Rug Row and Gig Street, sheds in The Shaft, and the
// Old Floe mostly park. The walls are cartoon-shaded and tiled with window bays: glass, curtains, some cracked, some boarded up.
const toon = (colour: string): MeshToonMaterial =>
  new MeshToonMaterial({ color: colour, gradientMap: toonSteps });

function instanced(
  name: string,
  geometry: BufferGeometry,
  pieces: readonly (readonly [Matrix4, string])[],
): InstancedMesh {
  const mesh = new InstancedMesh(
    geometry,
    toon("#ffffff"),
    Math.max(1, pieces.length),
  );
  mesh.name = name;
  mesh.count = pieces.length;
  pieces.forEach(([matrix, colour], index) => {
    mesh.setMatrixAt(index, matrix);
    mesh.setColorAt(index, new Color(colour));
  });
  return mesh;
}

export interface Blocks {
  // How dark it is (0 day, 1 night): windows and shop signs light up.
  night(part: number): void;
}

export function buildBlocks(city: Group): Blocks {
  const towers = new Group();
  towers.name = "towers";
  const lit: MeshToonMaterial[] = [];
  const signs: MeshToonMaterial[] = [];
  const roofs: [Matrix4, string][] = [];
  const tanks: [Matrix4, string][] = [];
  const trunks: [Matrix4, string][] = [];
  const crowns: [Matrix4, string][] = [];
  const pines: [Matrix4, string][] = [];
  const fronts = createShell();
  styles.forEach((look, borough) => {
    const low = createShell();
    const high = createShell();
    for (let corner = 0; corner < 4; corner += 1)
      if (borough !== 2 || corner === 3)
        buildLot(borough, corner, { fronts, high, low, roofs, tanks });
    const [front, back] = look.walls;
    for (const [shell, wall, name] of [
      [low, front, "low"],
      [high, back, "high"],
    ] as const) {
      const material = new MeshToonMaterial({
        color: "#ffffff",
        emissive: "#ffffff",
        emissiveIntensity: 0,
        gradientMap: toonSteps,
        vertexColors: true,
      });
      const day = facade(
        borough * 2 + (name === "low" ? 0 : 1),
        wall,
        look.trim,
        false,
      );
      const night = facade(
        borough * 2 + (name === "low" ? 0 : 1),
        wall,
        look.trim,
        true,
      );
      if (day === null || night === null) material.color.set(wall);
      else {
        material.map = day;
        material.emissiveMap = night;
        lit.push(material);
      }
      const mesh = new Mesh(shell.geometry(), material);
      mesh.name = `${name}-${String(borough)}`;
      towers.add(mesh);
    }
    if (look.trees === null) return;
    const left = (block * (borough % 3)) / 100;
    const top = (block * Math.floor(borough / 3)) / 100;
    for (let k = 0; k < 14; k += 1) {
      const along = (k % 7) * 16 + 8;
      if (along > 46 && along < 74) continue;
      const side = k < 7 ? 51.2 : 68.8;
      const x = left + (k % 2 === 0 ? along : side);
      const z = top + (k % 2 === 0 ? side : along);
      if (look.trees === "palm") {
        trunks.push([box(x, 4, z, 0.5, 8, 0.5), "#8a6a4a"]);
        crowns.push([box(x, 8.5, z, 3.2, 1.2, 3.2), "#3fae6b"]);
      } else
        pines.push([
          box(x, 3, z, 2.6, 6, 2.6),
          k % 3 === 0 ? "#e8f6ff" : "#2f6f57",
        ]);
    }
  });
  const shopMaterial = new MeshToonMaterial({
    color: "#ffffff",
    emissive: "#ffffff",
    emissiveIntensity: 0.1,
    gradientMap: toonSteps,
  });
  const day = shopfronts(false);
  const night = shopfronts(true);
  if (day !== null && night !== null) {
    shopMaterial.map = day;
    shopMaterial.emissiveMap = night;
    signs.push(shopMaterial);
  } else shopMaterial.color.set("#3a3346");
  const strip = new Mesh(fronts.geometry(), shopMaterial);
  strip.name = "shopfronts";
  towers.add(
    strip,
    instanced("roof-units", new BoxGeometry(1, 1, 1), roofs),
    instanced("water-tanks", new CylinderGeometry(0.5, 0.5, 1, 8), tanks),
  );
  city.add(
    towers,
    instanced("trunks", new CylinderGeometry(0.5, 0.5, 1, 6), trunks),
    instanced("palms", new SphereGeometry(0.5, 8, 6), crowns),
    instanced("pines", new ConeGeometry(0.5, 1, 7), pines),
  );
  return {
    night(part) {
      for (const material of lit) material.emissiveIntensity = part * 1.1;
      for (const material of signs)
        material.emissiveIntensity = 0.1 + part * 0.9;
    },
  };
}
