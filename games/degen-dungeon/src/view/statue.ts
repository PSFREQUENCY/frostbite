import {
  BoxGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  TorusGeometry,
} from "three";

import { statue } from "../rules/machine.ts";
import { metres } from "./city.ts";

// The Ice Runner: a runner caught mid-stride in ice, on a plinth beside the street in The Old Floe. It sleeps sunk to its shoulders. When
// the hero reaches the top it rises to its full height, and the ring of the Time Machine opens on the street in front of it. These are
// stand-in shapes for the kit's statue; the rules know only where it stands and whether it has risen.
export interface Statue {
  // Eases the statue toward risen or asleep, and turns the ring.
  pose(risen: boolean, seconds: number, dt: number): void;
  readonly root: Group;
}

type Triple = readonly [number, number, number];
const height = 4.2;
// Each part of the runner: its size, where it is, and how far it leans into the run.
const parts: readonly (readonly [Triple, Triple, number])[] = [
  [[0.9, 1.5, 0.5], [0, 2.6, 0], 0.25],
  [[0.6, 0.6, 0.6], [0, 3.75, 0.3], 0],
  [[0.35, 1.6, 0.35], [-0.25, 1.1, 0.5], -0.7],
  [[0.35, 1.6, 0.35], [0.25, 1.1, -0.5], 0.7],
  [[0.3, 1.2, 0.3], [-0.65, 2.7, -0.4], 0.9],
  [[0.3, 1.2, 0.3], [0.65, 2.7, 0.4], -0.9],
];

export function buildStatue(): Statue {
  const root = new Group();
  root.name = "statue";
  root.position.set(metres(statue.x), 0, metres(statue.z));
  const ice = new MeshStandardMaterial({
    color: "#bfe9ff",
    emissive: "#1d5d7a",
    roughness: 0.2,
  });
  const plinth = new Mesh(
    new BoxGeometry(3, 1, 3),
    new MeshStandardMaterial({ color: "#31406b", roughness: 0.8 }),
  );
  plinth.position.set(0, 0.5, -6);
  const runner = new Group();
  runner.name = "runner";
  for (const [size, at, lean] of parts) {
    const part = new Mesh(new BoxGeometry(...size), ice);
    part.position.set(...at);
    part.rotation.x = lean;
    runner.add(part);
  }
  const ring = new Mesh(
    new TorusGeometry(2.2, 0.14, 8, 40),
    new MeshStandardMaterial({ color: "#5beac6", emissive: "#5beac6" }),
  );
  ring.name = "machine";
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.2;
  root.add(plinth, runner, ring);
  let lift = 0;
  const settle = (): void => {
    runner.position.set(0, 1 - height * 0.8 * (1 - lift), -6);
    ring.visible = lift > 0.5;
    ring.scale.setScalar(0.6 + 0.4 * lift);
  };
  settle();
  return {
    pose(risen, seconds, dt) {
      lift += ((risen ? 1 : 0) - lift) * (1 - Math.exp(-1.5 * Math.max(0, dt)));
      settle();
      ring.rotation.z = seconds;
    },
    root,
  };
}
