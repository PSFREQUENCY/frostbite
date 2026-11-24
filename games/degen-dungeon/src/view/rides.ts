import { BoxGeometry, Group, Mesh, MeshToonMaterial } from "three";

import type { Ride } from "../rules/types.ts";
import { buildKit, kits } from "./kits.ts";
import { addNeon, type Neon } from "./neon.ts";
import { buildSaucer } from "./saucers.ts";
import { toonSteps } from "./textures.ts";

// The ride under the hero (`kits.ts` builds each): only one shows at a time. A ride taken from the kerb keeps its own colour, a car its
// broken side window; the driver's door swings open and shut as the hero gets in; the helicopter's rotor turns, and the visitors' saucer
// spins under the hero's feet; the Fancy Lot's hover car glows.
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
    // How far the driver's door is open (0 shut, 1 wide).
    door?: number,
  ): void;
}

const kinds: readonly Exclude<Ride, "foot">[] = [
  "bike",
  "board",
  "boat",
  "car",
  "heli",
  "hover",
  "moto",
  "saucer",
  "scooter",
  "semi",
  "truck",
  "van",
];
const standard: Readonly<Record<string, string>> = {
  bike: "#ff5d5d",
  board: "#ff7a1a",
  car: "#e0b341",
  hover: "#e6e9f2",
  moto: "#11131c",
  scooter: "#5beac6",
  semi: "#2f6fb5",
  truck: "#3fae6b",
  van: "#f4f8ff",
};
// Where each ride with a driver's door has its hinge (the door's front edge, on the left) and how long and tall the door is (metres).
const doors: Readonly<
  Record<string, readonly [number, number, number, number, number]>
> = {
  car: [0.99, 0.82, 0.55, 1.3, 0.75],
  semi: [1.27, 1.35, 2.1, 1.5, 1.4],
  truck: [1.01, 0.95, 2.2, 1.2, 0.8],
  van: [1.01, 0.8, 1.6, 1.1, 0.95],
};

export function buildRides(): Rides {
  const root = new Group();
  root.name = "rides";
  const built = new Map<Ride, Group>();
  const hinges: Group[] = [];
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
  let spinner: Group | null = null;
  let glow: Neon | null = null;
  for (const ride of kinds) {
    const group = buildKit(kits[ride], paint);
    group.name = ride;
    // The visitors' saucer, small enough to stand on, turning under the hero's feet.
    if (ride === "saucer") {
      spinner = buildSaucer();
      spinner.scale.setScalar(0.42);
      spinner.position.y = 0.32;
      group.add(spinner);
    }
    if (ride === "heli") {
      rotor = new Mesh(
        new BoxGeometry(7, 0.08, 0.35),
        new MeshToonMaterial({ color: "#11131c", gradientMap: toonSteps }),
      );
      rotor.position.y = 2.8;
      group.add(rotor);
    }
    if (ride === "car") {
      crack.position.set(0.84, 1.12, -0.2);
      group.add(crack);
    }
    // The hover car floats (`lift.ts`) over a pool of its own light, lit along its body.
    if (ride === "hover") {
      glow = addNeon(group, {
        at: [0, 0.8, 0],
        colour: "#ff3df2",
        edge: 0.05,
        edged: (mesh) => mesh.material === paint,
        halo: 4,
        pool: [4, 6.4],
      });
      const pool = glow.root.getObjectByName("neon-pool");
      if (pool !== undefined) pool.position.y = -0.4;
    }
    const hinge = doors[ride];
    if (hinge !== undefined) {
      const [hx, hy, hz, long, tall] = hinge;
      const pivot = new Group();
      pivot.name = "door";
      pivot.position.set(hx, hy, hz);
      const panel = new Mesh(new BoxGeometry(0.06, tall, long), paint);
      panel.position.z = -long / 2;
      pivot.add(panel);
      group.add(pivot);
      hinges.push(pivot);
    }
    built.set(ride, group);
    root.add(group);
  }
  return {
    root,
    show(ride, x, y, z, turn, seconds, colour, broken = false, door = 0) {
      for (const pivot of hinges) pivot.rotation.y = door * 1.15;
      for (const [name, group] of built) {
        group.visible = name === ride;
        if (name !== ride) continue;
        group.position.set(x, y, z);
        group.rotation.y = turn;
      }
      paint.color.set(colour ?? standard[ride] ?? "#e0b341");
      crack.visible = broken;
      if (rotor !== null) rotor.rotation.y = seconds * 18;
      if (spinner !== null) spinner.rotation.y = seconds * 2.4;
      if (ride === "hover") glow?.show(seconds);
    },
  };
}
