import {
  CylinderGeometry,
  Group,
  InstancedMesh,
  MeshStandardMaterial,
} from "three";

import { box, hash } from "./blocks.ts";

// The Great Airdrop on screen: DUN tumbling out of the sky all round the hero. With the magnet or the vacuum the nearest coins bend
// toward the hero as they fall. The rules count what is caught by patch; this is only how it looks.
const coins = 2_400;
const area = 70;
const sky = 45;

export interface Airdrop {
  fall(on: boolean, seconds: number, x: number, z: number, pull: number): void;
  readonly root: Group;
}

export function buildAirdrop(): Airdrop {
  const root = new Group();
  root.name = "airdrop";
  const mesh = new InstancedMesh(
    new CylinderGeometry(0.28, 0.28, 0.06, 10),
    new MeshStandardMaterial({
      color: "#ffd166",
      emissive: "#b8860b",
      emissiveIntensity: 0.8,
      metalness: 0.6,
      roughness: 0.3,
    }),
    coins,
  );
  mesh.name = "coins";
  root.add(mesh);
  root.visible = false;
  return {
    fall(on, seconds, x, z, pull) {
      root.visible = on;
      if (!on) return;
      for (let index = 0; index < coins; index += 1) {
        const dx = (hash(index, 1, 2) - 0.5) * area;
        const dz = (hash(index, 2, 3) - 0.5) * area;
        const y =
          sky -
          ((seconds * (6 + 6 * hash(index, 4, 5)) + hash(index, 6, 7) * sky) %
            sky);
        const near = Math.max(0, 1 - Math.hypot(dx, dz) / (area * 0.35)) * pull;
        const bend = Math.min(0.9, near * (1 - y / sky));
        mesh.setMatrixAt(
          index,
          box(x + dx * (1 - bend), y, z + dz * (1 - bend), 1, 1, 1),
        );
      }
      mesh.rotation.y = 0;
      mesh.instanceMatrix.needsUpdate = true;
    },
    root,
  };
}
