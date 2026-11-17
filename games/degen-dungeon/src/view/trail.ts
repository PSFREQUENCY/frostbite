import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  CylinderGeometry,
  DoubleSide,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
} from "three";

import { box } from "./hash.ts";
import { hillAt } from "./hill.ts";
import { canvasOf } from "./textures.ts";

// The trail up Mount WAGMI: a dirt path a little over two metres wide that switchbacks from a trailhead sign at the end of The Old Floe's
// middle street up to the terrace under the sign, with timber steps where it is steep and rope on posts along its sides. It only shows
// the way: the rules let feet walk the whole slope.

// The trail, from the end of the Floe's middle street up the switchbacks to the terrace (metres).
const turns: readonly (readonly [number, number])[] = [
  [360.5, 60],
  [370, 60],
  [381, 64],
  [390, 76],
  [396, 86],
  [404, 82],
  [412, 70],
  [419, 54],
  [424, 42],
  [432, 40],
  [440, 50],
  [446, 64],
  [450, 76],
  [456, 79],
];
export const trail: readonly Vector3[] = new CatmullRomCurve3(
  turns.map(([x, z]) => new Vector3(x, 0, z)),
)
  .getSpacedPoints(170)
  .map((point) => point.setY(hillAt(point.x, point.z)));
export const nearTrail = (x: number, z: number, within: number): boolean =>
  trail.some((point) => Math.hypot(point.x - x, point.z - z) < within);

// The trail's dirt, a ribbon laid on the ground a little over two metres wide.
function path(): Mesh {
  const corners = new Float32Array(trail.length * 6);
  const faces: number[] = [];
  trail.forEach((point, index) => {
    const next = trail[Math.min(trail.length - 1, index + 1)] ?? point;
    const prior = trail[Math.max(0, index - 1)] ?? point;
    const dx = next.x - prior.x;
    const dz = next.z - prior.z;
    const length = Math.hypot(dx, dz) || 1;
    for (const [side, sign] of [
      [0, 1],
      [1, -1],
    ] as const) {
      const x = point.x - (dz / length) * 1.1 * sign;
      const z = point.z + (dx / length) * 1.1 * sign;
      corners.set([x, hillAt(x, z) + 0.08, z], index * 6 + side * 3);
    }
    if (index > 0) {
      const at = index * 2;
      faces.push(at - 2, at - 1, at, at - 1, at + 1, at);
    }
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(corners, 3));
  geometry.setIndex(faces);
  geometry.computeVertexNormals();
  const mesh = new Mesh(
    geometry,
    new MeshStandardMaterial({
      color: "#b8996b",
      roughness: 1,
      side: DoubleSide,
    }),
  );
  mesh.name = "trail";
  mesh.receiveShadow = true;
  return mesh;
}

const matrix = new Matrix4();
const spin = new Quaternion();
const place = new Vector3();
const scale = new Vector3();
const up = new Vector3(0, 1, 0);
const axis = new Vector3(1, 0, 0);
const way = new Vector3();
// The timber steps, the posts and the rope along the trail.
function rails(): Group {
  const root = new Group();
  const steps: Matrix4[] = [];
  const posts: Matrix4[] = [];
  const ropes: Matrix4[] = [];
  const tops: Record<number, Vector3 | null> = { [-1]: null, 1: null };
  trail.forEach((point, index) => {
    const next = trail[index + 1];
    if (next === undefined) return;
    way.subVectors(next, point);
    const heading = Math.atan2(way.x, way.z);
    const climb = way.y / Math.max(0.1, Math.hypot(way.x, way.z));
    if (index % 3 === 0 && Math.abs(climb) > 0.14) {
      spin.setFromAxisAngle(up, heading);
      steps.push(
        matrix
          .clone()
          .compose(
            place.set(point.x, point.y + 0.1, point.z),
            spin,
            scale.set(2.3, 0.16, 0.28),
          ),
      );
    }
    if (index % 6 !== 0) return;
    for (const side of [-1, 1]) {
      const x = point.x + (way.z / Math.hypot(way.x, way.z)) * 1.45 * side;
      const z = point.z - (way.x / Math.hypot(way.x, way.z)) * 1.45 * side;
      const y = hillAt(x, z);
      posts.push(box(x, y + 0.5, z, 0.14, 1, 0.14));
      const top = new Vector3(x, y + 0.88, z);
      const prior = tops[side] ?? null;
      if (prior !== null) {
        way.subVectors(top, prior);
        spin.setFromUnitVectors(axis, way.clone().normalize());
        ropes.push(
          matrix
            .clone()
            .compose(
              place.addVectors(top, prior).multiplyScalar(0.5),
              spin,
              scale.set(way.length(), 0.035, 0.035),
            ),
        );
      }
      tops[side] = top;
    }
  });
  for (const [name, list, colour, shape] of [
    ["trail-steps", steps, "#7a5230", new BoxGeometry(1, 1, 1)],
    ["trail-posts", posts, "#6b4a2e", new BoxGeometry(1, 1, 1)],
    ["trail-rope", ropes, "#d8c08a", new BoxGeometry(1, 1, 1)],
  ] as const) {
    const mesh = new InstancedMesh(
      shape,
      new MeshStandardMaterial({ color: colour, roughness: 0.9 }),
      list.length,
    );
    mesh.name = name;
    list.forEach((each, index) => mesh.setMatrixAt(index, each));
    root.add(mesh);
  }
  return root;
}

// The trailhead: a board on two posts at the foot of the trail, facing the city.
function trailhead(): Group {
  const root = new Group();
  root.name = "trailhead";
  const wood = new MeshStandardMaterial({ color: "#6b4a2e", roughness: 0.9 });
  const words = canvasOf(256, 128, (ink) => {
    ink.fillStyle = "#7a5230";
    ink.fillRect(0, 0, 256, 128);
    ink.strokeStyle = "#f2e6c8";
    ink.lineWidth = 5;
    ink.strokeRect(8, 8, 240, 112);
    ink.fillStyle = "#f2e6c8";
    ink.textAlign = "center";
    ink.font = "bold 34px sans-serif";
    ink.fillText("MOUNT WAGMI", 128, 54, 226);
    ink.font = "bold 24px sans-serif";
    ink.fillText("TRAIL TO THE SIGN", 128, 96, 226);
  });
  const board = new Mesh(
    new BoxGeometry(0.1, 1.2, 2.4),
    words === null
      ? wood
      : [wood, wood, wood, wood, wood, wood].map((one, side) =>
          side === 1
            ? new MeshStandardMaterial({ map: words, roughness: 0.9 })
            : one,
        ),
  );
  board.position.set(363, 1.7, 64.2);
  board.name = "trailhead-board";
  for (const z of [63.1, 65.3]) {
    const post = new Mesh(new CylinderGeometry(0.08, 0.08, 2.2, 6), wood);
    post.position.set(363.05, 1.1, z);
    root.add(post);
  }
  root.add(board);
  return root;
}

export function buildTrail(): Group {
  const root = new Group();
  root.name = "trail-all";
  root.add(path(), rails(), trailhead());
  return root;
}
