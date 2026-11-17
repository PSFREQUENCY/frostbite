import {
  Color,
  Group,
  InstancedMesh,
  Matrix4,
  MeshToonMaterial,
  Quaternion,
  Vector3,
} from "three";

import { hash } from "./hash.ts";
import { kits, mergedKit } from "./kits.ts";
import { toonSteps } from "./textures.ts";

// Traffic on the middle streets, driving on the right and wrapping round the island: heavy in the morning and the evening rush, lighter at
// midday, and only a few cars late at night, headlights on after dark. A car slows behind the hero rather than drive through them. It is
// scenery: nothing it does reaches the rules.
export interface Traffic {
  readonly root: Group;
  // The clock (seconds), the time of day (0 morning to 1 dusk), how dark it is, and where the hero is (metres).
  show(
    seconds: number,
    along: number,
    dark: number,
    x: number,
    z: number,
  ): void;
}

const lanes: {
  readonly across: boolean;
  readonly at: number;
  readonly way: 1 | -1;
}[] = [];
for (const middle of [60, 180, 300])
  for (const way of [1, -1] as const) {
    lanes.push({ across: false, at: middle + way * 3, way });
    lanes.push({ across: true, at: middle - way * 3, way });
  }
const perLane = 7;
const loop = 360;
const paints = [
  "#e63946",
  "#2f6fb5",
  "#f4f8ff",
  "#11131c",
  "#ffd166",
  "#9aa3b5",
  "#3fae6b",
] as const;

// How busy the streets are at a time of day (0 to 1): two rush hours, a quieter midday, and a late night that empties them.
export const busy = (along: number, dark: number): number =>
  Math.max(
    0.15,
    (0.55 + 0.45 * Math.cos(along * Math.PI * 4)) * (1 - dark * 0.75),
  );

const pose = new Matrix4();
const place = new Vector3();
const spin = new Quaternion();
const up = new Vector3(0, 1, 0);
const size = new Vector3();

export function buildTraffic(): Traffic {
  const root = new Group();
  root.name = "traffic";
  const cars = new InstancedMesh(
    mergedKit(kits.car),
    new MeshToonMaterial({
      color: "#ffffff",
      gradientMap: toonSteps,
      vertexColors: true,
    }),
    lanes.length * perLane,
  );
  cars.name = "traffic-cars";
  for (let index = 0; index < cars.count; index += 1)
    cars.setColorAt(
      index,
      new Color(
        paints[Math.floor(hash(index, 9, 2) * paints.length)] ?? "#e63946",
      ),
    );
  root.add(cars);
  const offsets = new Float32Array(cars.count);
  const last = { seconds: 0 };
  return {
    root,
    show(seconds, along, dark, x, z) {
      const step = Math.min(0.1, Math.max(0, seconds - last.seconds));
      last.seconds = seconds;
      const share = busy(along, dark);
      lanes.forEach((lane, laneIndex) => {
        for (let slot = 0; slot < perLane; slot += 1) {
          const index = laneIndex * perLane + slot;
          const shown = hash(index, 3, 3) < share;
          const start = (slot / perLane) * loop + hash(index, 4, 4) * 20;
          const speed = 9 + hash(index, 5, 5) * 5;
          let at =
            (((start + lane.way * (seconds * speed - (offsets[index] ?? 0))) %
              loop) +
              loop) %
            loop;
          const [cx, cz] = lane.across ? [lane.at, at] : [at, lane.at];
          // Slow behind the hero: hold back while they stand in the lane just ahead.
          const ahead = lane.across ? (z - cz) * lane.way : (x - cx) * lane.way;
          const beside = lane.across ? Math.abs(x - cx) : Math.abs(z - cz);
          if (shown && beside < 2.2 && ahead > 0 && ahead < 8) {
            offsets[index] = (offsets[index] ?? 0) + speed * step;
            at =
              (((start + lane.way * (seconds * speed - (offsets[index] ?? 0))) %
                loop) +
                loop) %
              loop;
          }
          const [px, pz] = lane.across ? [lane.at, at] : [at, lane.at];
          const turn = lane.across
            ? lane.way === 1
              ? 0
              : Math.PI
            : lane.way === 1
              ? Math.PI / 2
              : -Math.PI / 2;
          size.setScalar(shown ? 1 : 0);
          cars.setMatrixAt(
            index,
            pose.compose(
              place.set(px, 0, pz),
              spin.setFromAxisAngle(up, turn),
              size,
            ),
          );
        }
      });
      cars.instanceMatrix.needsUpdate = true;
    },
  };
}
