import { BoxGeometry, Group, Mesh, MeshToonMaterial } from "three";

import type { Ride } from "../rules/types.ts";
import { buildKit, kits } from "./kits.ts";
import { toonSteps } from "./textures.ts";

// The ride under the hero (`kits.ts` builds each): only one shows at a time. A car taken from the kerb keeps its own colour and a broken
// side window; the helicopter's rotor turns.
export interface Rides {
  readonly root: Group;
  show(
    ride: Ride,
    x: number,
    y: number,
    z: number,
    turn: number,
    seconds: number,
    paint?: string,
    broken?: boolean,
  ): void;
}

const standard: Readonly<Record<string, string>> = {
  bike: "#ff5d5d",
  car: "#e0b341",
  scooter: "#5beac6",
};

export function buildRides(): Rides {
  const root = new Group();
  root.name = "rides";
  const built = new Map<Ride, Group>();
  const paint = new MeshToonMaterial({
    color: "#e0b341",
    gradientMap: toonSteps,
  });
  let rotor: Mesh | null = null;
  const crack = new Mesh(
    new BoxGeometry(0.04, 0.4, 0.8),
    new MeshToonMaterial({ color: "#f4f8ff", gradientMap: toonSteps }),
  );
  crack.name = "broken-window";
  for (const [ride, parts] of Object.entries(kits)) {
    const group = buildKit(parts, paint);
    group.name = ride;
    if (ride === "heli") {
      rotor = new Mesh(
        new BoxGeometry(7, 0.08, 0.35),
        new MeshToonMaterial({ color: "#11131c", gradientMap: toonSteps }),
      );
      rotor.position.y = 2.8;
      group.add(rotor);
    }
    if (ride === "car") {
      crack.position.set(0.85, 1.22, 0.2);
      group.add(crack);
    }
    if (
      ride === "bike" ||
      ride === "boat" ||
      ride === "car" ||
      ride === "heli" ||
      ride === "scooter"
    )
      built.set(ride, group);
    root.add(group);
  }
  return {
    root,
    show(ride, x, y, z, turn, seconds, colour, broken = false) {
      for (const [name, group] of built) {
        group.visible = name === ride;
        if (name !== ride) continue;
        group.position.set(x, y, z);
        group.rotation.y = turn;
      }
      paint.color.set(colour ?? standard[ride] ?? "#e0b341");
      crack.visible = broken;
      if (rotor !== null) rotor.rotation.y = seconds * 18;
    },
  };
}
