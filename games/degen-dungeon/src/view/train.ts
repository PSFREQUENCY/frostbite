import {
  BoxGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
} from "three";

import { nextStop, stopAt } from "../rules/business.ts";
import type { DayState } from "../rules/types.ts";
import { boroughs, loop } from "../rules/world.ts";
import { painted } from "./boards.ts";
import { deckHeight } from "./lift.ts";
import { settle } from "./settle.ts";

// The Green Line's stations and the hero's own ride on it (`rules/business.ts`): at every stop a glass lift tube from the pavement up to a
// glass station round the rails, with the line's name and the borough's on a sign by its door; and while the hero rides, a car of
// their own with glass sides, waiting at the station while the lift goes up, then running along the rails with the hero inside, to wait
// at the next station while the lift comes down.
export interface Train {
  readonly root: Group;
  show(state: DayState | null, seconds: number): void;
}

const green = new MeshStandardMaterial({
  color: "#22c55e",
  emissive: "#0f6b33",
  flatShading: true,
});
const steel = new MeshStandardMaterial({ color: "#2b3a33", roughness: 0.7 });
const glass = new MeshBasicMaterial({
  color: "#9ff5c6",
  depthWrite: false,
  opacity: 0.22,
  side: DoubleSide,
  transparent: true,
});

const block = (
  width: number,
  height: number,
  deep: number,
  x: number,
  y: number,
  z: number,
  material: MeshBasicMaterial | MeshStandardMaterial,
): Mesh => {
  const mesh = new Mesh(new BoxGeometry(width, height, deep), material);
  mesh.position.set(x, y, z);
  return mesh;
};

// One station: the lift tube and its cab, the glass room round the rails at the top, and the sign.
function buildStation(borough: number): Group {
  const station = new Group();
  station.name = `station-${String(borough)}`;
  const tube = new Mesh(
    new CylinderGeometry(1.4, 1.4, deckHeight, 18, 1, true),
    glass,
  );
  tube.position.y = deckHeight / 2;
  const cab = block(2, 0.2, 2, 0, 0.1, 0, steel);
  cab.name = "lift-cab";
  const room = block(4.2, 3.2, 10, 0, deckHeight + 1.4, 0, glass);
  const roof = block(4.6, 0.3, 10.4, 0, deckHeight + 3.1, 0, green);
  const posts = [-1.3, 1.3].map((x) =>
    block(0.2, deckHeight, 0.2, x, deckHeight / 2, -1.5, steel),
  );
  const sign = new Mesh(
    new PlaneGeometry(3.6, 1.35),
    painted(`GREEN LINE · ${boroughs[borough] ?? ""}`, "#22c55e"),
  );
  sign.position.set(0, 3.2, 1.5);
  station.add(tube, cab, room, roof, ...posts, sign);
  return station;
}

// The hero's car: open to the sky, so the ride can be seen, with a green floor and skirt, a glass rail at waist height, a green nose
// and tail, and seats down the middle.
function buildCar(): Group {
  const car = new Group();
  car.name = "rider-car";
  car.add(
    block(2.8, 0.3, 9, 0, -0.15, 0, green),
    block(0.12, 0.6, 9, 1.35, 0.3, 0, green),
    block(0.12, 0.6, 9, -1.35, 0.3, 0, green),
    block(0.06, 0.6, 9, 1.35, 0.9, 0, glass),
    block(0.06, 0.6, 9, -1.35, 0.9, 0, glass),
    block(2.8, 1.6, 0.5, 0, 0.8, 4.3, green),
    block(2.8, 1.2, 0.5, 0, 0.6, -4.3, green),
    block(2.4, 0.5, 0.6, 0, 0.25, 2.2, steel),
    block(2.4, 0.5, 0.6, 0, 0.25, -2.2, steel),
  );
  return car;
}

export function buildTrain(): Train {
  const root = new Group();
  root.name = "train";
  const platforms = new Group();
  const stations = loop.map((borough) => {
    const station = buildStation(borough);
    const at = stopAt(borough);
    station.position.set(at.x / 100, 0, at.z / 100);
    // The glass room runs along the rails the train leaves on: east-west on the north and south of the loop, north-south on its sides.
    const next = stopAt(nextStop(borough));
    const across = Math.abs(next.x - at.x) > Math.abs(next.z - at.z);
    station.rotation.y = across ? Math.PI / 2 : 0;
    platforms.add(station);
    return station;
  });
  root.add(platforms);
  // The stations never move but for their lift cabs: joined by material.
  settle(platforms);
  const car = buildCar();
  root.add(car);
  return {
    root,
    show(state, seconds) {
      const line = state?.line ?? null;
      car.visible = state !== null && line !== null;
      // Every lift cab bobs at the bottom; the one the hero rides goes up and down with them.
      for (const station of stations) {
        const cab = station.getObjectByName("lift-cab");
        if (cab !== undefined) cab.position.y = 0.1 + Math.sin(seconds) * 0.02;
      }
      if (state === null || line === null) return;
      const to = stopAt(line.to);
      const turn = Math.atan2(to.x - line.from.x, to.z - line.from.z);
      car.position.set(state.x / 100, deckHeight, state.z / 100);
      car.rotation.y = turn;
    },
  };
}
