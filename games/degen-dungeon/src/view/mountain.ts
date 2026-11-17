import {
  BufferAttribute,
  Color,
  DodecahedronGeometry,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  Quaternion,
  Vector3,
} from "three";

import { hash } from "./hash.ts";
import {
  az,
  cz,
  foot,
  hillAt,
  landAt,
  pad,
  smooth,
  tallest,
  terrace,
} from "./hill.ts";
import { buildTrail, nearTrail } from "./trail.ts";
import { buildSign } from "./wagmi.ts";

// Mount WAGMI as it looks: the hill (`hill.ts`) rising out of the sea east of The Old Floe, sand at the shore, grass and scrub up the
// slopes, dry earth near the top and rock where it is steep; the trail up it (`trail.ts`); and on the terrace at the ridge, the WAGMI
// sign (`wagmi.ts`).
const sand = new Color("#d8c79a");
const grass = new Color("#6f8f4e");
const scrub = new Color("#8b8a52");
const dry = new Color("#a58f5f");
const rock = new Color("#7d7266");
const earth = new Color("#b89a6a");
function ground(): Mesh {
  const geometry = new PlaneGeometry(154, 136, 77, 68);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(437, 0, 60);
  const points = geometry.getAttribute("position");
  const colours = new Float32Array(points.count * 3);
  const colour = new Color();
  for (let index = 0; index < points.count; index += 1) {
    const x = points.getX(index);
    const z = points.getZ(index);
    const y = landAt(x, z);
    points.setY(index, y);
    const slope = Math.hypot(landAt(x + 1, z) - y, landAt(x, z + 1) - y);
    const high = y / tallest;
    colour
      .copy(grass)
      .lerp(scrub, smooth(high * 2))
      .lerp(dry, smooth(high * 2 - 1));
    if (y < 1.2) colour.copy(sand);
    colour.lerp(rock, smooth((slope - 0.55) * 3));
    if (Math.abs(y - terrace) < 0.05) colour.copy(earth);
    colour.offsetHSL(0, 0, (hash(index, 3, 8) - 0.5) * 0.06);
    colours.set([colour.r, colour.g, colour.b], index * 3);
  }
  geometry.setAttribute("color", new BufferAttribute(colours, 3));
  geometry.computeVertexNormals();
  const mesh = new Mesh(
    geometry,
    new MeshStandardMaterial({
      flatShading: true,
      roughness: 0.95,
      vertexColors: true,
    }),
  );
  mesh.name = "mountain";
  mesh.receiveShadow = true;
  return mesh;
}

const matrix = new Matrix4();
const spin = new Quaternion();
const place = new Vector3();
const scale = new Vector3();
const up = new Vector3(0, 1, 0);
// Scrub and boulders on the slopes, kept off the trail and the terrace.
function scrubland(): Group {
  const root = new Group();
  const bushes: Matrix4[] = [];
  const stones: Matrix4[] = [];
  for (let index = 0; index < 900 && bushes.length < 300; index += 1) {
    const x = foot + 2 + hash(index, 1, 3) * 148;
    const z = cz - az + hash(index, 2, 5) * az * 2;
    const y = hillAt(x, z);
    const inPad = x > pad.x0 - 2 && z > pad.z0 - 2 && z < pad.z1 + 2;
    if (y < 1.4 || inPad || nearTrail(x, z, 3)) continue;
    const size = 0.6 + hash(index, 7, 2) * 1.1;
    spin.setFromAxisAngle(up, hash(index, 4, 4) * 6.3);
    (index % 7 === 0 ? stones : bushes).push(
      matrix
        .clone()
        .compose(
          place.set(x, y + size * 0.3, z),
          spin,
          scale.set(size, size * (index % 7 === 0 ? 0.7 : 0.6), size),
        ),
    );
  }
  for (const [name, list, colour, shape] of [
    ["scrub", bushes, "#6f8c4a", new IcosahedronGeometry(0.8, 0)],
    ["boulders", stones, "#8a8072", new DodecahedronGeometry(0.7, 0)],
  ] as const) {
    const mesh = new InstancedMesh(
      shape,
      new MeshStandardMaterial({ flatShading: true, roughness: 1 }),
      list.length,
    );
    mesh.name = name;
    const tint = new Color();
    list.forEach((each, index) => {
      mesh.setMatrixAt(index, each);
      mesh.setColorAt(
        index,
        tint.set(colour).offsetHSL(0, 0, (hash(index, 5, 9) - 0.5) * 0.14),
      );
    });
    mesh.castShadow = true;
    root.add(mesh);
  }
  return root;
}

export interface Mountain {
  readonly root: Group;
}

export function buildMountain(): Mountain {
  const root = new Group();
  root.name = "mount-wagmi";
  root.add(ground(), buildTrail(), scrubland(), buildSign(terrace).root);
  return { root };
}
