import {
  BoxGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
} from "three";

import { openTo, spotNamed } from "../rules/places.ts";
import type { DayState } from "../rules/types.ts";
import { metres } from "./city.ts";
import { addNeon } from "./neon.ts";

// The wallet dropped in the riot's crowd (`rules/errands.ts`), lying on the street until it is picked up: brown leather folded over a
// peek of green notes and a gold clasp, its edges lit lime green, in a halo of the same light with gold sparkles circling it.
export interface Wallet {
  readonly root: Group;
  show(state: DayState | null, seconds: number): void;
}

const dropped = spotNamed("wallet");

export function buildWallet(): Wallet {
  const root = new Group();
  root.name = "dropped-wallet";
  const leather = new MeshStandardMaterial({
    color: "#7a4a26",
    roughness: 0.6,
  });
  const part = (
    size: readonly [number, number, number],
    at: readonly [number, number, number],
    material: MeshStandardMaterial,
  ): Mesh => {
    const mesh = new Mesh(new BoxGeometry(...size), material);
    mesh.position.set(...at);
    return mesh;
  };
  const wallet = new Group();
  wallet.add(
    part([0.24, 0.05, 0.16], [0, 0.025, 0], leather),
    part(
      [0.24, 0.014, 0.09],
      [0, 0.057, -0.035],
      new MeshStandardMaterial({ color: "#5e3519", roughness: 0.6 }),
    ),
    part(
      [0.19, 0.03, 0.03],
      [0, 0.03, 0.085],
      new MeshStandardMaterial({
        color: "#5fcf7a",
        emissive: "#2f8f4a",
        emissiveIntensity: 0.6,
      }),
    ),
  );
  const clasp = new Mesh(
    new SphereGeometry(0.018, 10, 8),
    new MeshStandardMaterial({
      color: "#ffd166",
      emissive: "#ffd166",
      emissiveIntensity: 0.8,
      metalness: 0.6,
    }),
  );
  clasp.position.set(0, 0.06, 0.012);
  wallet.add(clasp);
  wallet.scale.setScalar(1.6);
  wallet.rotation.y = 0.5;
  root.add(wallet);
  const neon = addNeon(wallet, {
    at: [0, 0.12, 0],
    colour: "#39ff14",
    edge: 0.012,
    edged: (mesh) => mesh !== clasp,
    glint: "#ffd166",
    beam: 2.6,
    halo: 1.6,
    ring: 0.35,
    sparkles: 6,
  });
  if (dropped !== undefined)
    root.position.set(metres(dropped.x), 0.01, metres(dropped.z));
  return {
    root,
    show(state, seconds) {
      root.visible =
        state !== null && dropped !== undefined && openTo(dropped, state);
      if (root.visible) neon.show(seconds);
    },
  };
}
