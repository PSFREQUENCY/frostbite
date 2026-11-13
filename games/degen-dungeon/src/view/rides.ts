import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
} from "three";

import type { Ride } from "../rules/types.ts";

// The four rides, built in code and facing along +z: a scooter, a car with four wheels, a little yacht, and a helicopter whose rotor
// turns. Only one shows at a time, under the hero who rides it.
type Part = readonly [
  shape: "ball" | "box" | "wheel",
  colour: string,
  size: readonly [number, number, number],
  at: readonly [number, number, number],
];
const kits: Readonly<Record<Exclude<Ride, "foot">, readonly Part[]>> = {
  boat: [
    ["box", "#f5f0ff", [2.4, 1, 6], [0, 0.5, 0]],
    ["box", "#2a4b8d", [1.8, 1.1, 2.2], [0, 1.5, -0.6]],
    ["box", "#ffd166", [2.5, 0.2, 6.1], [0, 1, 0]],
  ],
  car: [
    ["box", "#e0b341", [1.9, 0.7, 3.9], [0, 0.65, 0]],
    ["box", "#11131c", [1.6, 0.6, 2], [0, 1.25, -0.2]],
    ["wheel", "#11131c", [0.38, 0.3, 0.38], [0.95, 0.38, 1.2]],
    ["wheel", "#11131c", [0.38, 0.3, 0.38], [-0.95, 0.38, 1.2]],
    ["wheel", "#11131c", [0.38, 0.3, 0.38], [0.95, 0.38, -1.2]],
    ["wheel", "#11131c", [0.38, 0.3, 0.38], [-0.95, 0.38, -1.2]],
  ],
  heli: [
    ["ball", "#ff5d5d", [1.3, 1.1, 1.8], [0, 1.3, 0]],
    ["box", "#ff5d5d", [0.3, 0.3, 3.4], [0, 1.5, -2.4]],
    ["box", "#11131c", [0.15, 0.6, 0.15], [0, 2.5, 0]],
    ["box", "#11131c", [2.4, 0.15, 0.6], [0, 0.15, 0]],
  ],
  scooter: [
    ["box", "#5beac6", [0.45, 0.12, 1.4], [0, 0.25, 0]],
    ["box", "#11131c", [0.08, 1, 0.08], [0, 0.75, 0.6]],
    ["box", "#11131c", [0.6, 0.08, 0.08], [0, 1.25, 0.6]],
    ["wheel", "#11131c", [0.2, 0.12, 0.2], [0, 0.2, 0.62]],
    ["wheel", "#11131c", [0.2, 0.12, 0.2], [0, 0.2, -0.62]],
  ],
};

export interface Rides {
  readonly root: Group;
  show(
    ride: Ride,
    x: number,
    y: number,
    z: number,
    turn: number,
    seconds: number,
  ): void;
}

export function buildRides(): Rides {
  const root = new Group();
  root.name = "rides";
  const built = new Map<Ride, Group>();
  let rotor: Mesh | null = null;
  for (const [ride, parts] of Object.entries(kits)) {
    const group = new Group();
    group.name = ride;
    for (const [shape, colour, size, at] of parts) {
      const geometry =
        shape === "ball"
          ? new SphereGeometry(1, 12, 10)
          : shape === "box"
            ? new BoxGeometry(1, 1, 1)
            : new CylinderGeometry(1, 1, 1, 12);
      const mesh = new Mesh(
        geometry,
        new MeshStandardMaterial({
          color: colour,
          flatShading: true,
          roughness: 0.5,
        }),
      );
      mesh.scale.set(...size);
      mesh.position.set(...at);
      if (shape === "wheel") mesh.rotation.z = Math.PI / 2;
      group.add(mesh);
    }
    if (ride === "heli") {
      rotor = new Mesh(
        new BoxGeometry(7, 0.08, 0.35),
        new MeshStandardMaterial({ color: "#11131c" }),
      );
      rotor.position.y = 2.8;
      group.add(rotor);
    }
    built.set(
      ride === "boat" || ride === "car" || ride === "heli" || ride === "scooter"
        ? ride
        : "foot",
      group,
    );
    root.add(group);
  }
  return {
    root,
    show(ride, x, y, z, turn, seconds) {
      for (const [name, group] of built) {
        group.visible = name === ride;
        if (name !== ride) continue;
        group.position.set(x, y, z);
        group.rotation.y = turn;
      }
      if (rotor !== null) rotor.rotation.y = seconds * 18;
    },
  };
}
