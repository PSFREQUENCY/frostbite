import {
  CatmullRomCurve3,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshToonMaterial,
  Plane,
  TorusGeometry,
  TubeGeometry,
  Vector3,
  type Material,
} from "three";

import {
  haus,
  inLobby,
  isletRadius,
  liftAt,
  liftTenths,
  topFloor,
} from "../rules/haus.ts";
import type { DayState } from "../rules/types.ts";
import { buildFancyLot } from "./fancy-lot.ts";
import { buildFloors, storeyHeight } from "./haus-floors.ts";
import { settle } from "./settle.ts";
import { toonSteps } from "./textures.ts";

// Haus De Savage (`rules/haus.ts`) as a living tree: a trunk braided from eight ribs of dark bronze bark twisting up from roots that grip
// the islet, gold veins of light running up it, the lobby's glass drum at its foot, and three glass elevators climbing its south face (the
// middle one is the hero's, carrying them floor to floor; the other two never stop). The floors, the penthouse and the rooftop are
// `haus-floors.ts`'s; the plaza's showroom, the valet's lift, the bridge's arch and Ms. Opal's yacht `fancy-lot.ts`'s. While the hero is
// inside, everything of the tower above their floor is cut away, so the camera sees in.
export interface Haus {
  readonly root: Group;
  show(day: DayState | null, seconds: number): void;
}

const [hx, hz] = [haus.x / 100, haus.z / 100];
const ribs = 8;
const height = topFloor * storeyHeight;
// How far a rib stands from the middle at a height: flared into roots at the foot and into the crown at the top.
const ribRadius = (y: number): number =>
  y < 4
    ? 6.6 + ((4 - y) / 4) ** 2 * 2.2
    : y > height - 3
      ? 6.6 + ((y - height + 3) / 3) ** 2 * 2
      : 6.6;

export function buildHaus(): Haus {
  const root = new Group();
  root.name = "haus";
  // Everything of the tower keeps below this plane, which is raised out of the way while the hero is outside.
  const cut = new Plane(new Vector3(0, -1, 0), 1_000);
  const clipped = <M extends Material>(material: M): M => {
    material.clippingPlanes = [cut];
    return material;
  };
  const toon = (color: string): MeshToonMaterial =>
    clipped(new MeshToonMaterial({ color, gradientMap: toonSteps }));
  const lit = (color: string): MeshBasicMaterial =>
    clipped(new MeshBasicMaterial({ color, toneMapped: false }));
  const glass = (color: string, opacity: number): MeshBasicMaterial =>
    clipped(
      new MeshBasicMaterial({
        color,
        depthWrite: false,
        opacity,
        side: DoubleSide,
        transparent: true,
      }),
    );
  const tower = new Group();
  tower.position.set(hx, 0, hz);
  // The islet, its stone rim and the plaza's paving.
  const islet = new Mesh(
    new CylinderGeometry(isletRadius / 100, isletRadius / 100 + 1, 1.6, 64),
    toon("#cfc6b8"),
  );
  islet.position.y = -0.8;
  const rim = new Mesh(
    new TorusGeometry(isletRadius / 100, 0.25, 8, 96),
    toon("#8a8174"),
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.02;
  // The ribs, twisting a quarter turn on the way up, and the veins of light along two of them.
  const bark = toon("#7a5238");
  const veins = lit("#ffd166");
  for (let rib = 0; rib < ribs; rib += 1) {
    const points: Vector3[] = [];
    for (let y = -0.4; y <= height - 0.2; y += 2) {
      const angle = (rib * Math.PI * 2) / ribs + y * 0.018;
      const radius = ribRadius(y);
      points.push(
        new Vector3(Math.sin(angle) * radius, y, Math.cos(angle) * radius),
      );
    }
    const curve = new CatmullRomCurve3(points);
    tower.add(new Mesh(new TubeGeometry(curve, 64, 0.45, 6, false), bark));
    if (rib % 4 === 1) {
      const glow = new CatmullRomCurve3(
        points.map((point) => point.clone().multiplyScalar(1.09).setY(point.y)),
      );
      tower.add(new Mesh(new TubeGeometry(glow, 64, 0.08, 4, false), veins));
    }
  }
  // The lobby: a glass drum with its doorway toward the bridge (north), a marble floor and the concierge's round desk.
  const lobby = new Mesh(
    new CylinderGeometry(
      6.2,
      6.2,
      3.8,
      48,
      1,
      true,
      Math.PI + 0.3,
      Math.PI * 2 - 0.6,
    ),
    glass("#9fe8ff", 0.28),
  );
  lobby.position.y = 1.9;
  const floor = new Mesh(
    new CylinderGeometry(6.3, 6.3, 0.06, 48),
    toon("#f2efe6"),
  );
  floor.position.y = 0.03;
  const desk = new Mesh(
    new TorusGeometry(1.1, 0.35, 8, 24, Math.PI * 1.4),
    toon("#2a2350"),
  );
  desk.rotation.set(Math.PI / 2, 0, Math.PI * 0.8);
  desk.position.set(0, 0.6, 0.2);
  tower.add(islet, rim, lobby, floor, desk);
  // The three glass elevators on the south face, on their rails; the hero's is the middle one.
  const rail = toon("#c9ced6");
  const cars = [-2.6, 0, 2.6].map((east, index) => {
    for (const side of [-1.15, 1.15]) {
      const post = new Mesh(new CylinderGeometry(0.08, 0.08, height, 6), rail);
      post.position.set(
        east + side,
        height / 2,
        liftAt.z / 100 - hz + (index === 1 ? 0 : 0.5),
      );
      tower.add(post);
    }
    const car = new Group();
    car.name = index === 1 ? "haus-lift" : "haus-lift-side";
    const pane = new Mesh(
      new CylinderGeometry(1, 1, 2.9, 24, 1, true),
      glass("#7fe0ff", 0.3),
    );
    pane.position.y = 1.5;
    const base = new Mesh(
      new CylinderGeometry(1.05, 1.05, 0.15, 24),
      toon("#2a2f45"),
    );
    const crown = new Mesh(new TorusGeometry(1, 0.07, 6, 32), lit("#38e8ff"));
    crown.rotation.x = Math.PI / 2;
    crown.position.y = 2.95;
    car.add(pane, base, crown);
    car.position.set(east, 0, liftAt.z / 100 - hz + (index === 1 ? 0 : 0.5));
    tower.add(car);
    return car;
  });
  const floors = buildFloors({ glass, lit, toon });
  const lot = buildFancyLot();
  tower.add(floors.root);
  root.add(tower, lot.root);
  settle(tower, (mesh) => mesh.parent !== tower);
  return {
    root,
    show(day, seconds) {
      // The hero's elevator: where the ride has got to, or waiting at the hero's floor, or drifting up and down with nobody in it.
      const middle = cars[1];
      const ride = day?.elevator ?? null;
      const inside =
        day !== null &&
        (day.floor > 0 || ride !== null || inLobby(day.x, day.z));
      const level =
        ride !== null && day !== null
          ? (liftTenths(ride, day.tick) / 10) * storeyHeight
          : inside
            ? (day?.floor ?? 0) * storeyHeight
            : (height / 2) * (1 - Math.cos(seconds * 0.08));
      if (middle !== undefined) middle.position.y = level;
      cars.forEach((car, index) => {
        if (car !== middle)
          car.position.y =
            (height / 2) *
            (1 - Math.cos(seconds * (0.1 + index * 0.02) + index * 2));
      });
      // Inside, everything above the hero's floor (the lobby's own ceiling height on the ground) is cut away.
      cut.constant =
        inside && level < height - 0.5 ? level + storeyHeight - 0.4 : 1_000;
      floors.show(day, seconds);
      lot.show(day, seconds);
    },
  };
}
