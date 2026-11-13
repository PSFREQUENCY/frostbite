import {
  CapsuleGeometry,
  Color,
  Euler,
  Group,
  InstancedMesh,
  Matrix4,
  MeshToonMaterial,
  Quaternion,
  SphereGeometry,
  Vector3,
  type BufferGeometry,
} from "three";

import { block, lots } from "../rules/constants.ts";
import { hash } from "./hash.ts";
import { toonSteps } from "./textures.ts";

// The people of Nakasato going about their day: walkers strolling round the pavements of every block (slowly, arms swinging, each in
// their own clothes), and pairs stopped on the corner talking, one waving their hands about while the other nods. They are cartoon
// figures, drawn many at a time; nobody here is anyone in particular, and nothing they do touches the rules.
export interface Walkers {
  readonly root: Group;
  show(seconds: number, busy: number): void;
}

const skins = [
  "#f6d5b8",
  "#f1c7a8",
  "#e0b08a",
  "#c98a5e",
  "#8d5a3b",
  "#5c3a24",
] as const;
const coats = [
  "#e63946",
  "#2f6fb5",
  "#ffd166",
  "#3fae6b",
  "#ff9ecf",
  "#c9b6ff",
  "#ff8a5b",
  "#f4f8ff",
  "#2a2f45",
] as const;
const legsColours = [
  "#2a2f45",
  "#3a3f47",
  "#5d6470",
  "#8a6a4a",
  "#1b2440",
] as const;
const hairs = [
  "#11131c",
  "#3a2a20",
  "#8a5a3a",
  "#e0b341",
  "#c0c6d0",
  "#ff5d5d",
] as const;

interface Walker {
  readonly box: readonly [number, number, number, number];
  readonly phase: number;
  readonly speed: number;
}
interface Pair {
  readonly turn: number;
  readonly x: number;
  readonly z: number;
}
const walkers: Walker[] = [];
const pairs: Pair[] = [];
for (let borough = 0; borough < 9; borough += 1)
  lots.forEach(([north, south], lane) =>
    lots.forEach(([west, east], column) => {
      const left = (block * (borough % 3) + west) / 100 - 0.8;
      const top = (block * Math.floor(borough / 3) + north) / 100 - 0.8;
      const right = (block * (borough % 3) + east) / 100 + 0.8;
      const bottom = (block * Math.floor(borough / 3) + south) / 100 + 0.8;
      const lot = borough * 4 + lane * 2 + column;
      for (let k = 0; k < 4; k += 1)
        walkers.push({
          box: [left, top, right, bottom],
          phase: hash(lot, k, 1) * 200,
          speed: (0.7 + hash(lot, k, 2) * 0.5) * (k % 2 === 0 ? 1 : -1),
        });
      const along = 6 + hash(lot, 9, 3) * 30;
      pairs.push({ turn: 0, x: left + along, z: bottom });
    }),
  );
const people = walkers.length + pairs.length * 2;

// A point on a lot's pavement ring, `distance` metres round it clockwise from its north-west corner, and the way along it.
function round(
  box: Walker["box"],
  distance: number,
): readonly [number, number, number] {
  const [x0, z0, x1, z1] = box;
  const w = x1 - x0;
  const h = z1 - z0;
  const total = 2 * (w + h);
  const at = ((distance % total) + total) % total;
  if (at < w) return [x0 + at, z0, 0];
  if (at < w + h) return [x1, z0 + at - w, Math.PI / 2];
  if (at < 2 * w + h) return [x1 - (at - w - h), z1, Math.PI];
  return [x0, z1 - (at - 2 * w - h), -Math.PI / 2];
}

const pivot = (geometry: BufferGeometry, drop: number): BufferGeometry =>
  geometry.translate(0, -drop, 0);
const body = new Matrix4();
const local = new Matrix4();
const turnQ = new Quaternion();
const swingQ = new Quaternion();
const swingE = new Euler();
const where = new Vector3();
const offset = new Vector3();
const one = new Vector3(1, 1, 1);
const up = new Vector3(0, 1, 0);

export function buildWalkers(): Walkers {
  const root = new Group();
  root.name = "walkers";
  const material = new MeshToonMaterial({
    color: "#ffffff",
    gradientMap: toonSteps,
  });
  const part = (
    name: string,
    geometry: BufferGeometry,
    count: number,
  ): InstancedMesh => {
    const mesh = new InstancedMesh(geometry, material, count);
    mesh.name = name;
    root.add(mesh);
    return mesh;
  };
  const torsos = part(
    "walker-torsos",
    new CapsuleGeometry(0.22, 0.42, 3, 8),
    people,
  );
  const heads = part("walker-heads", new SphereGeometry(0.21, 10, 8), people);
  const hair = part(
    "walker-hair",
    new SphereGeometry(0.22, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2),
    people,
  );
  const legs = part(
    "walker-legs",
    pivot(new CapsuleGeometry(0.09, 0.55, 3, 6), 0.36),
    people * 2,
  );
  const arms = part(
    "walker-arms",
    pivot(new CapsuleGeometry(0.07, 0.45, 3, 6), 0.3),
    people * 2,
  );
  for (let index = 0; index < people; index += 1) {
    const coat = new Color(
      coats[Math.floor(hash(index, 1, 7) * coats.length)] ?? "#ffffff",
    );
    torsos.setColorAt(index, coat);
    heads.setColorAt(
      index,
      new Color(
        skins[Math.floor(hash(index, 2, 7) * skins.length)] ?? "#e0b08a",
      ),
    );
    hair.setColorAt(
      index,
      new Color(
        hairs[Math.floor(hash(index, 3, 7) * hairs.length)] ?? "#11131c",
      ),
    );
    const trousers = new Color(
      legsColours[Math.floor(hash(index, 4, 7) * legsColours.length)] ??
        "#2a2f45",
    );
    for (const side of [0, 1]) {
      legs.setColorAt(index * 2 + side, trousers);
      arms.setColorAt(index * 2 + side, coat);
    }
  }
  const put = (
    mesh: InstancedMesh,
    index: number,
    ox: number,
    oy: number,
    oz: number,
    swing = 0,
    lean = 0,
  ): void => {
    swingQ.setFromEuler(swingE.set(swing, 0, lean));
    local.compose(offset.set(ox, oy, oz), swingQ, one);
    mesh.setMatrixAt(index, local.premultiply(body));
  };
  const figure = (
    index: number,
    x: number,
    z: number,
    turn: number,
    stride: number,
    wave: number,
    nod: number,
    bob: number,
  ): void => {
    body.compose(where.set(x, bob, z), turnQ.setFromAxisAngle(up, turn), one);
    put(torsos, index, 0, 1.15, 0, 0.06 * Math.abs(stride));
    put(heads, index, 0, 1.68, 0, nod);
    put(hair, index, 0, 1.72, -0.01, nod);
    put(legs, index * 2, 0.11, 0.88, 0, stride);
    put(legs, index * 2 + 1, -0.11, 0.88, 0, -stride);
    put(arms, index * 2, 0.3, 1.42, 0, -stride * 0.8 - wave, -0.1);
    put(arms, index * 2 + 1, -0.3, 1.42, 0, stride * 0.8, 0.1);
  };
  return {
    root,
    show(seconds, busy) {
      root.visible = busy > 0;
      if (!root.visible) return;
      walkers.forEach((walker, index) => {
        const [x, z, heading] = round(
          walker.box,
          walker.phase + walker.speed * seconds,
        );
        const turn = Math.PI / 2 - heading + (walker.speed < 0 ? Math.PI : 0);
        const step = Math.sin(
          seconds * 4.2 * Math.abs(walker.speed) + walker.phase,
        );
        figure(index, x, z, turn, step * 0.45, 0, 0, Math.abs(step) * 0.04);
      });
      pairs.forEach((pair, index) => {
        const talker = walkers.length + index * 2;
        const talk = Math.sin(seconds * 3 + index);
        figure(
          talker,
          pair.x - 0.45,
          pair.z,
          Math.PI / 2,
          0,
          0.9 + talk * 0.6,
          0,
          0,
        );
        figure(
          talker + 1,
          pair.x + 0.45,
          pair.z,
          -Math.PI / 2,
          0,
          0,
          Math.max(0, Math.sin(seconds * 2.2 + index)) * 0.25,
          0,
        );
      });
      for (const mesh of [torsos, heads, hair, legs, arms])
        mesh.instanceMatrix.needsUpdate = true;
    },
  };
}
