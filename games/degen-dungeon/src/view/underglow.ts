import { Color, InstancedMesh, Matrix4, Quaternion, Vector3 } from "three";

import { spots } from "../rules/places.ts";
import type { DayState, Wheels } from "../rules/types.ts";
import { hash } from "./hash.ts";
import { flat, lightOf, poolMap } from "./neon.ts";
import { drawnAt } from "./parked.ts";

// Under every ride parked at a kerb, ready to borrow, a pool of neon light on the road, each its own colour: faint by day, bright after
// dark, and drawn only near the hero. A ride taken from its kerb takes its light with it. One draw for all of them.
export interface Underglow {
  readonly root: InstancedMesh;
  show(
    day: DayState,
    x: number,
    z: number,
    seconds: number,
    dark: number,
  ): void;
}

// How wide and long each kind's pool is (metres).
const pools: Readonly<Record<Wheels, readonly [number, number]>> = {
  bike: [1.6, 2.6],
  car: [4, 6.4],
  moto: [1.7, 2.8],
  scooter: [1.6, 2.5],
  semi: [4.4, 9.5],
  truck: [4.2, 7.6],
  van: [4.2, 7.2],
};
const neons = [
  "#ff3df2",
  "#38e8ff",
  "#39ff14",
  "#ffd166",
  "#b06bff",
  "#ff8a5b",
] as const;
// How near a pool is drawn (metres).
export const glowSight = 60;
const kerb = spots.flatMap((spot) => (spot.kind === "parked" ? [spot] : []));
const matrix = new Matrix4();
const turn = new Quaternion();
const where = new Vector3();
const size = new Vector3();
const upward = new Vector3(0, 1, 0);
const none = new Matrix4().makeScale(0, 0, 0);

export function buildUnderglow(): Underglow {
  const material = lightOf("#ffffff", false, poolMap);
  const root = new InstancedMesh(flat, material, kerb.length);
  root.name = "underglow";
  root.frustumCulled = false;
  kerb.forEach((spot, index) => {
    const colour =
      neons[Math.floor(hash(spot.x, spot.z, 11) * neons.length)] ?? "#38e8ff";
    root.setColorAt(index, new Color(colour));
  });
  return {
    root,
    show(day, x, z, seconds, dark) {
      const taken = new Set(day.done);
      kerb.forEach((spot, index) => {
        const at = drawnAt(spot);
        const near =
          Math.abs(at.x - x) < glowSight && Math.abs(at.z - z) < glowSight;
        if (!near || taken.has(spot.id)) {
          root.setMatrixAt(index, none);
          return;
        }
        const [across, along] = pools[spot.ride];
        where.set(at.x, 0.05, at.z);
        turn.setFromAxisAngle(upward, at.turn);
        root.setMatrixAt(
          index,
          matrix.compose(where, turn, size.set(across, 1, along)),
        );
      });
      root.instanceMatrix.needsUpdate = true;
      material.opacity =
        (0.35 + 0.65 * dark) * (0.85 + 0.15 * Math.sin(seconds * 2.5));
    },
  };
}
