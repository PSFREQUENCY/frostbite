import {
  CircleGeometry,
  CylinderGeometry,
  Group,
  InstancedMesh,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
} from "three";

import { beach, tunnel, waterline } from "../rules/constants.ts";
import { box } from "./blocks.ts";

// North of the island under the sea: the oldest tunnel, lit, and SHA Beach at its end at the first sunrise of the game, with footprints
// that run to the waterline and stop. Both are hidden until the Genesis Room is open.
const m = (centimetres: number): number => centimetres / 100;

export interface North {
  readonly root: Group;
  show(open: boolean, seconds: number): void;
}

export function buildNorth(): North {
  const root = new Group();
  root.name = "north";
  const glow = new MeshStandardMaterial({
    color: "#9fd8ff",
    emissive: "#5beac6",
    emissiveIntensity: 0.6,
    opacity: 0.45,
    transparent: true,
  });
  const length = m(tunnel.z1 - tunnel.z0);
  const tube = new Mesh(new CylinderGeometry(4, 4, length, 12, 1, true), glow);
  tube.rotation.x = Math.PI / 2;
  tube.position.set(
    m((tunnel.x0 + tunnel.x1) / 2),
    2,
    m((tunnel.z0 + tunnel.z1) / 2),
  );
  const floor = new Mesh(
    new PlaneGeometry(m(tunnel.x1 - tunnel.x0), length),
    new MeshStandardMaterial({ color: "#1b2a3a" }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(tube.position.x, 0.02, tube.position.z);
  const sand = new Mesh(
    new PlaneGeometry(m(beach.x1 - beach.x0), m(beach.z1 - beach.z0)),
    new MeshStandardMaterial({ color: "#f2d7a6", roughness: 1 }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(
    m((beach.x0 + beach.x1) / 2),
    0.05,
    m((beach.z0 + beach.z1) / 2),
  );
  const sun = new Mesh(
    new CircleGeometry(30, 32),
    new MeshStandardMaterial({
      color: "#ffb36b",
      emissive: "#ff9a3c",
      emissiveIntensity: 1.2,
    }),
  );
  sun.name = "sunrise";
  sun.position.set(240, 10, m(beach.z0) - 220);
  const steps = new InstancedMesh(
    new CircleGeometry(0.25, 8).rotateX(-Math.PI / 2),
    new MeshStandardMaterial({ color: "#8a6a4a" }),
    16,
  );
  steps.name = "footprints";
  for (let at = 0; at < 16; at += 1)
    steps.setMatrixAt(
      at,
      box(
        240 + (at % 2 === 0 ? -0.4 : 0.4),
        0.08,
        m(beach.z1) - at * ((m(beach.z1) - m(waterline)) / 16),
        1,
        1,
        1,
      ),
    );
  root.add(tube, floor, sand, sun, steps);
  root.visible = false;
  return {
    root,
    show(open, seconds) {
      root.visible = open;
      sun.position.y = 6 + Math.min(18, seconds * 0.3);
    },
  };
}
