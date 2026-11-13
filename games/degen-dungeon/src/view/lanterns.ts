import {
  AdditiveBlending,
  CylinderGeometry,
  DoubleSide,
  Group,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
} from "three";

import { spotNamed } from "../rules/places.ts";
import { box, hash } from "./hash.ts";
import { lanternPaper } from "./prints.ts";

// The lantern night: after dark, thousands of paper lanterns drift up from the Old Floe and over the city, every one somebody's message to
// the crypto gods, glowing warm against the sky. The hero's own lantern, with what the player wrote on it, rises from the lantern ground
// once the wish is made, and the camera can follow it up.
export interface Lanterns {
  readonly root: Group;
  // How dark it is (0 day, 1 night), the clock, and whether the hero's own lantern is up (and since when, in seconds).
  show(night: number, seconds: number, sent: number | null): void;
  // Writes the player's message on the hero's lantern.
  write(message: string): void;
  // Where the hero's own lantern is now (metres), for the camera.
  where(): readonly [number, number, number];
}

const count = 2_400;
const ground = spotNamed("lanterns") ?? { x: 30_000, z: 6_000 };
const [gx, gz] = [ground.x / 100, ground.z / 100];

export function buildLanterns(): Lanterns {
  const root = new Group();
  root.name = "lanterns";
  const paper = new MeshBasicMaterial({ color: "#ffb35a" });
  const many = new InstancedMesh(
    new CylinderGeometry(0.32, 0.26, 0.6, 6),
    paper,
    count,
  );
  many.name = "lantern-sky";
  const halo = new InstancedMesh(
    new SphereGeometry(0.9, 8, 6),
    new MeshBasicMaterial({
      blending: AdditiveBlending,
      color: "#ff9a3c",
      depthWrite: false,
      opacity: 0.18,
      transparent: true,
    }),
    count,
  );
  halo.name = "lantern-glow";
  const mine = new Mesh(
    new CylinderGeometry(0.55, 0.45, 1, 10, 1, true),
    new MeshBasicMaterial({ color: "#ffd9a0", side: DoubleSide }),
  );
  mine.name = "my-lantern";
  const flame = new Mesh(
    new SphereGeometry(0.16, 8, 6),
    new MeshBasicMaterial({ color: "#fff3c4" }),
  );
  mine.add(flame);
  flame.position.y = -0.35;
  root.add(many, halo, mine);
  let place: readonly [number, number, number] = [gx, 2, gz];
  return {
    root,
    show(night, seconds, sent) {
      root.visible = night > 0.02;
      if (!root.visible) return;
      for (let index = 0; index < count; index += 1) {
        // Each rises from somewhere in the park and drifts east on the wind, then starts again: a slow loop that never ends.
        const rate = 0.5 + hash(index, 1, 3) * 0.9;
        const life = 220 / rate;
        const age = (seconds + hash(index, 2, 3) * life) % life;
        const angle = hash(index, 3, 3) * Math.PI * 2;
        const spread = 6 + hash(index, 4, 3) * 50;
        const x =
          gx +
          Math.cos(angle) * spread +
          age * 0.35 +
          Math.sin(age * 0.4 + index) * 1.5;
        const z = gz + Math.sin(angle) * spread + age * 0.12;
        const y = 1.5 + age * rate * night;
        const shown = night * Math.min(1, age / 4);
        many.setMatrixAt(index, box(x, y, z, shown, shown, shown));
        halo.setMatrixAt(index, box(x, y, z, shown, shown, shown));
      }
      many.instanceMatrix.needsUpdate = true;
      halo.instanceMatrix.needsUpdate = true;
      mine.visible = sent !== null;
      if (sent === null) return;
      const up = Math.max(0, seconds - sent);
      place = [
        gx + Math.sin(up * 0.5) * 0.6 + up * 0.2,
        1.6 + up * 0.9,
        gz + up * 0.05,
      ];
      mine.position.set(...place);
      mine.rotation.y = up * 0.3;
    },
    where: () => place,
    write(message) {
      const texture = lanternPaper(
        message.trim() === "" ? "wagmi" : message.trim(),
      );
      if (texture === null) return;
      mine.material.map = texture;
      mine.material.color.set("#ffffff");
      mine.material.needsUpdate = true;
    },
  };
}
