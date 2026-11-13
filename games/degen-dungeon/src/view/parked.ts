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
import type { DayState, Ride } from "../rules/types.ts";
import { hash } from "./hash.ts";
import { kits, mergedKit } from "./kits.ts";
import { toonSteps } from "./textures.ts";

// The cars, scooters and bikes parked along the kerbs (the rules' parked spots), each its own colour, parked along its street. One taken
// is gone from its kerb; a ride left on the street stays where the hero stepped off it. Breaking into a car throws a burst of glass.
export interface Parked {
  readonly root: Group;
  show(
    day: DayState,
    x: number,
    z: number,
    heading: number,
    seconds: number,
  ): void;
  // The colour of a parked ride, by its id, for the ride under the hero.
  paintOf(id: string): string;
}

type Kind = "bike" | "car" | "scooter";
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

// Where a parked ride is drawn (metres): a car by the kerb in the parking lane, a scooter or bike on the edge of the pavement, along its
// street (a north-south street when it stands east or west of the borough's middle).
const drawnAt = (spot: (typeof parked)[number]) => {
  const local = spot.x % block;
  const northSouth = Math.abs(local - block / 2) === 850;
  const inward = spot.ride === "car" ? 1.1 : 0;
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
  const meshes = new Map<Kind, InstancedMesh>();
  for (const kind of ["bike", "car", "scooter"] as const) {
    const count = parked.filter((spot) => spot.ride === kind).length + leftMost;
    const mesh = new InstancedMesh(
      mergedKit(kits[kind]),
      new MeshToonMaterial({
        color: "#ffffff",
        gradientMap: toonSteps,
        vertexColors: true,
      }),
      count,
    );
    mesh.name = `parked-${kind}`;
    meshes.set(kind, mesh);
    root.add(mesh);
  }
  const slots = new Map<string, number>();
  const counts = new Map<Kind, number>([
    ["bike", 0],
    ["car", 0],
    ["scooter", 0],
  ]);
  const colours = new Map<string, string>();
  for (const spot of parked) {
    const index = counts.get(spot.ride) ?? 0;
    counts.set(spot.ride, index + 1);
    slots.set(spot.id, index);
    const colour =
      paints[Math.floor(hash(spot.x, spot.z, 5) * paints.length)] ?? "#e63946";
    colours.set(spot.id, colour);
    meshes.get(spot.ride)?.setColorAt(index, new Color(colour));
  }
  // Everything at its kerb to begin with; the rest of the instances (rides left on the street) hidden.
  for (const spot of parked) {
    const { turn, x, z } = drawnAt(spot);
    const mesh = meshes.get(spot.ride);
    const index = slots.get(spot.id);
    if (mesh !== undefined && index !== undefined) set(mesh, index, x, z, turn);
  }
  for (const [kind, mesh] of meshes)
    for (let slot = counts.get(kind) ?? 0; slot < mesh.count; slot += 1)
      set(mesh, slot, 0, 0, 0, false);
  const glass = new InstancedMesh(
    new PlaneGeometry(0.12, 0.09),
    new MeshBasicMaterial({ color: "#dff4ff", side: DoubleSide }),
    shards,
  );
  glass.name = "glass-burst";
  glass.visible = false;
  root.add(glass);
  // Rides left on the street, newest last, and the moment and place of the last broken window.
  const left: {
    kind: Kind;
    turn: number;
    x: number;
    z: number;
    colour: string;
  }[] = [];
  let lastRide: Ride = "foot";
  let lastSpot = "";
  let known = new Set<string>();
  let burst: { at: number; x: number; z: number } | null = null;
  return {
    paintOf: (id) => colours.get(id) ?? "#e0b341",
    root,
    show(day, x, z, heading, seconds) {
      const taken = new Set(day.done);
      for (const spot of parked) {
        const mesh = meshes.get(spot.ride);
        const index = slots.get(spot.id);
        if (mesh === undefined || index === undefined) continue;
        const { turn, x: px, z: pz } = drawnAt(spot);
        set(mesh, index, px, pz, turn, !taken.has(spot.id));
        if (!known.has(spot.id) && taken.has(spot.id)) {
          lastSpot = spot.id;
          if (spot.ride === "car" && day.tick > 0)
            burst = { at: seconds, x: px, z: pz };
        }
      }
      known = taken;
      // A ride stepped off stays beside the hero.
      if (
        lastRide !== day.ride &&
        day.ride === "foot" &&
        (lastRide === "car" || lastRide === "bike" || lastRide === "scooter")
      ) {
        left.push({
          colour: colours.get(lastSpot) ?? "#e0b341",
          kind: lastRide,
          turn: Math.PI / 2 - heading,
          x: x + Math.sin(heading) * 1.6,
          z: z - Math.cos(heading) * 1.6,
        });
        if (left.length > leftMost) left.shift();
      }
      lastRide = day.ride;
      const used = new Map<Kind, number>();
      for (const kind of ["bike", "car", "scooter"] as const) {
        const mesh = meshes.get(kind);
        if (mesh === undefined) continue;
        const start = mesh.count - leftMost;
        for (let slot = 0; slot < leftMost; slot += 1)
          set(mesh, start + slot, 0, 0, 0, false);
        used.set(kind, start);
      }
      for (const ride of left) {
        const mesh = meshes.get(ride.kind);
        const index = used.get(ride.kind) ?? 0;
        if (mesh === undefined) continue;
        set(mesh, index, ride.x, ride.z, ride.turn);
        mesh.setColorAt(index, new Color(ride.colour));
        used.set(ride.kind, index + 1);
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
