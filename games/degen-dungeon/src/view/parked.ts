import {
  Color,
  DoubleSide,
  Group,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  MeshToonMaterial,
  PlaneGeometry,
  Quaternion,
  Vector3,
} from "three";

import { block } from "../rules/constants.ts";
import { spots } from "../rules/places.ts";
import {
  motors,
  type DayState,
  type Left,
  type Wheels,
} from "../rules/types.ts";
import { hash } from "./hash.ts";
import { kits, mergedKit } from "./kits.ts";
import { toonSteps } from "./textures.ts";

// The rides parked along the kerbs (the rules' parked spots), each its own colour, parked along its street. One taken is gone from its
// kerb; one stepped off stays where the rules say it was left (the last six), its driver's door beside where the hero stood. Breaking into
// anything with an engine throws a burst of glass.
export interface Parked {
  readonly root: Group;
  show(
    day: DayState,
    x: number,
    z: number,
    heading: number,
    seconds: number,
    // A ride left on the street not to draw here (it is shown with its door swinging shut).
    hidden?: string,
  ): void;
  // The colour of a parked ride, by its id, for the ride under the hero.
  paintOf(id: string): string;
  // Where a ride left on the street is drawn (metres) and which way it faces, by its id.
  leftAt(
    id: string,
  ):
    | { readonly turn: number; readonly x: number; readonly z: number }
    | undefined;
}

const kinds: readonly Wheels[] = [
  "bike",
  "car",
  "moto",
  "scooter",
  "semi",
  "truck",
  "van",
];
// The rides that stand on the pavement's edge rather than in the parking lane.
export const kerbside = (ride: Wheels): boolean =>
  ride === "bike" || ride === "moto" || ride === "scooter";
const paints = [
  "#e63946",
  "#2f6fb5",
  "#f4f8ff",
  "#11131c",
  "#3fae6b",
  "#ffd166",
  "#ff8a5b",
  "#9aa3b5",
  "#c9b6ff",
] as const;
const parked = spots.flatMap((spot) => (spot.kind === "parked" ? [spot] : []));
const leftMost = 6;
const shards = 48;

const pose = new Matrix4();
const place = new Vector3();
const spin = new Quaternion();
const up = new Vector3(0, 1, 0);
const scale = new Vector3(1, 1, 1);
const set = (
  mesh: InstancedMesh,
  index: number,
  x: number,
  z: number,
  turn: number,
  shown = true,
): void => {
  scale.setScalar(shown ? 1 : 0);
  mesh.setMatrixAt(
    index,
    pose.compose(place.set(x, 0, z), spin.setFromAxisAngle(up, turn), scale),
  );
};

// Where a parked ride is drawn (metres): anything with four wheels by the kerb in the parking lane, a scooter, bike or motorbike on the
// edge of the pavement, along its street (a north-south street when it stands east or west of the borough's middle).
const drawnAt = (spot: (typeof parked)[number]) => {
  const local = spot.x % block;
  const northSouth = Math.abs(local - block / 2) === 850;
  const inward = kerbside(spot.ride) ? 0 : spot.ride === "semi" ? 1.3 : 1.1;
  const side = northSouth
    ? Math.sign(local - block / 2)
    : Math.sign((spot.z % block) - block / 2);
  return {
    turn: northSouth ? 0 : Math.PI / 2,
    x: spot.x / 100 - (northSouth ? side * inward : 0),
    z: spot.z / 100 - (northSouth ? 0 : side * inward),
  };
};

export function buildParked(): Parked {
  const root = new Group();
  root.name = "parked";
  const meshes = new Map<Wheels, InstancedMesh>();
  const slots = new Map<string, number>();
  const colours = new Map<string, string>();
  for (const kind of kinds) {
    const mine = parked.filter((spot) => spot.ride === kind);
    const mesh = new InstancedMesh(
      mergedKit(kits[kind]),
      new MeshToonMaterial({
        color: "#ffffff",
        gradientMap: toonSteps,
        vertexColors: true,
      }),
      mine.length + leftMost,
    );
    mesh.name = `parked-${kind}`;
    meshes.set(kind, mesh);
    root.add(mesh);
    // Everything at its kerb to begin with; the rest of the instances (rides left on the street) hidden.
    mine.forEach((spot, index) => {
      slots.set(spot.id, index);
      const colour =
        paints[Math.floor(hash(spot.x, spot.z, 5) * paints.length)] ??
        "#e63946";
      colours.set(spot.id, colour);
      mesh.setColorAt(index, new Color(colour));
      const { turn, x, z } = drawnAt(spot);
      set(mesh, index, x, z, turn);
    });
    for (let slot = mine.length; slot < mesh.count; slot += 1)
      set(mesh, slot, 0, 0, 0, false);
  }
  const glass = new InstancedMesh(
    new PlaneGeometry(0.12, 0.09),
    new MeshBasicMaterial({ color: "#dff4ff", side: DoubleSide }),
    shards,
  );
  glass.name = "glass-burst";
  glass.visible = false;
  root.add(glass);
  // Where each ride left on the street is drawn, by where it was left, worked out when it first appears: the hero stood at its door.
  const placed = new Map<string, { turn: number; x: number; z: number }>();
  const keyOf = (ride: Left): string =>
    `${ride.id}@${String(ride.x)},${String(ride.z)}`;
  let known = new Set<string>();
  let burst: { at: number; x: number; z: number } | null = null;
  return {
    leftAt(id) {
      for (const [key, at] of placed) if (key.startsWith(`${id}@`)) return at;
      return undefined;
    },
    paintOf: (id) => colours.get(id) ?? "#e0b341",
    root,
    show(day, x, z, heading, seconds, hidden = "") {
      const taken = new Set(day.done);
      for (const spot of parked) {
        const mesh = meshes.get(spot.ride);
        const index = slots.get(spot.id);
        if (mesh === undefined || index === undefined) continue;
        const { turn, x: px, z: pz } = drawnAt(spot);
        set(mesh, index, px, pz, turn, !taken.has(spot.id));
        if (!known.has(spot.id) && taken.has(spot.id) && day.tick > 0)
          if (motors.includes(spot.ride)) burst = { at: seconds, x: px, z: pz };
      }
      known = taken;
      const keys = new Set(day.left.map(keyOf));
      for (const key of placed.keys()) if (!keys.has(key)) placed.delete(key);
      const used = new Map<Wheels, number>();
      for (const [kind, mesh] of meshes) {
        const start = mesh.count - leftMost;
        for (let slot = 0; slot < leftMost; slot += 1)
          set(mesh, start + slot, 0, 0, 0, false);
        used.set(kind, start);
      }
      for (const ride of day.left) {
        const key = keyOf(ride);
        const away = kerbside(ride.ride) ? 0.7 : 1.35;
        const at = placed.get(key) ?? {
          turn: Math.PI / 2 - heading,
          x:
            (day.x === ride.x && day.z === ride.z ? x : ride.x / 100) -
            Math.sin(heading) * away,
          z:
            (day.x === ride.x && day.z === ride.z ? z : ride.z / 100) +
            Math.cos(heading) * away,
        };
        placed.set(key, at);
        const mesh = meshes.get(ride.ride);
        const index = used.get(ride.ride) ?? 0;
        if (mesh === undefined || ride.id === hidden) continue;
        set(mesh, index, at.x, at.z, at.turn);
        mesh.setColorAt(index, new Color(colours.get(ride.id) ?? "#e0b341"));
        used.set(ride.ride, index + 1);
      }
      for (const mesh of meshes.values()) {
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor !== null) mesh.instanceColor.needsUpdate = true;
      }
      const flying = burst === null ? -1 : seconds - burst.at;
      glass.visible = burst !== null && flying >= 0 && flying < 1.4;
      if (burst === null || !glass.visible) return;
      for (let piece = 0; piece < shards; piece += 1) {
        const angle = hash(piece, 4, 4) * Math.PI * 2;
        const speed = 1.5 + hash(piece, 5, 5) * 3;
        const rise = 1.2 + hash(piece, 6, 6) * 2.5 - 4.9 * flying;
        place.set(
          burst.x + Math.cos(angle) * speed * flying,
          Math.max(0.02, 1.2 + rise * flying),
          burst.z + Math.sin(angle) * speed * flying,
        );
        spin.setFromAxisAngle(up, angle + flying * 9);
        glass.setMatrixAt(piece, pose.compose(place, spin, scale.setScalar(1)));
      }
      glass.instanceMatrix.needsUpdate = true;
    },
  };
}
