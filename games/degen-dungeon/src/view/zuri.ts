import {
  BoxGeometry,
  CylinderGeometry,
  DoubleSide,
  Euler,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Mesh,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  Vector3,
  Color,
  type Object3D,
} from "three";

import { buildBody, type Body } from "./body.ts";
import type { Look } from "./looks.ts";

// Miss Mirinda, the Degen Dash's host: tall and poised, with deep brown skin, an Afro-hawk (a tall ridge of tight coils from brow to nape
// over close-cropped sides), a turquoise two-piece (a halter crop top and a long, high-waisted skirt with a high split up one side), gold
// hoops, a choker, bangles and a gold chain belt, and a gold ticket in her hand. Built on the town's jointed body, with her clothes and
// hair added to its named joints so they move with her. An original design, and a draft for the owner.
const skin = "#5a3824";
const turquoise = "#18c4b4";
const gold = "#f2c14e";
const zuriLook: Look = {
  body: skin,
  bulk: 0.9,
  coat: skin,
  face: "person",
  hair: "#3a2418",
  headSize: 0.98,
  height: 1.8,
  legs: skin,
  trim: gold,
};

const satin = new MeshStandardMaterial({
  color: turquoise,
  roughness: 0.35,
  side: DoubleSide,
});
const shine = new MeshStandardMaterial({
  color: gold,
  emissive: gold,
  emissiveIntensity: 0.25,
  metalness: 0.8,
  roughness: 0.3,
});
const lips = new MeshStandardMaterial({ color: "#7a2e3a", roughness: 0.4 });
const glow = new MeshStandardMaterial({
  color: gold,
  emissive: gold,
  emissiveIntensity: 0.9,
});

const joint = (body: Body, name: string): Object3D => {
  const found = body.root.getObjectByName(name);
  if (found === undefined) throw new Error(`no ${name} on the body`);
  return found;
};
const add = (
  parent: Object3D,
  mesh: Mesh,
  at: readonly [number, number, number],
  turn: readonly [number, number, number] = [0, 0, 0],
  scale: readonly [number, number, number] = [1, 1, 1],
): Mesh => {
  mesh.position.set(...at);
  mesh.rotation.set(...turn);
  mesh.scale.set(...scale);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
};

// The Afro-hawk: hundreds of small coils packed in a tall ridge from brow to nape, densest at its outer shell so the outline reads as
// soft coils rather than a helmet, darker at the roots, over sides cropped close (the plain head's hair, in a brown near her skin). A
// fixed sequence places them, so she looks the same every time.
export const hawkCoils = 600;
export function buildHawk(radius: number): InstancedMesh {
  const coils = new InstancedMesh(
    new TorusGeometry(0.017, 0.0065, 4, 7),
    new MeshStandardMaterial({ roughness: 0.75 }),
    hawkCoils,
  );
  coils.name = "afro-hawk";
  let seed = 7;
  const next = (): number => {
    seed = (seed * 16_807) % 2_147_483_647;
    return seed / 2_147_483_647;
  };
  const matrix = new Matrix4();
  const spin = new Quaternion();
  const turn = new Euler();
  const place = new Vector3();
  const size = new Vector3();
  const root = new Color("#140c07");
  const tip = new Color("#3b2516");
  const shade = new Color();
  for (let index = 0; index < hawkCoils; index += 1) {
    // A point in the ridge (narrow, tall, long), pushed toward its shell.
    const shell = 0.62 + 0.38 * Math.cbrt(next());
    const around = next() * Math.PI * 2;
    const up = Math.acos(1 - 2 * next());
    const x = Math.sin(up) * Math.cos(around) * 0.075 * shell;
    const y = Math.abs(Math.cos(up)) * 0.18 * shell;
    const z = Math.sin(up) * Math.sin(around) * 0.21 * shell;
    place.set(x, radius * 0.66 + y, z - radius * 0.12);
    turn.set(next() * Math.PI, next() * Math.PI, next() * Math.PI);
    spin.setFromEuler(turn);
    size.setScalar(0.7 + next() * 0.7);
    matrix.compose(place, spin, size);
    coils.setMatrixAt(index, matrix);
    coils.setColorAt(index, shade.copy(root).lerp(tip, y / 0.18));
  }
  coils.castShadow = true;
  return coils;
}

// Her body, dressed: the top and its halter straps on the spine, the skirt (whole to the knee, split below it) on the hips, the hawk and
// hoops on the head, the bangles and the ticket on the forearms.
export function buildZuri(): Body {
  const body = buildBody(zuriLook);
  body.root.name = "zuri";
  const spine = joint(body, "spine");
  const hips = joint(body, "hips");
  const head = joint(body, "head");
  const neck = head.parent ?? spine;
  add(
    spine,
    new Mesh(new CylinderGeometry(0.19, 0.195, 0.2, 16), satin),
    [0, 0.45, 0],
    [0, 0, 0],
    [1, 1, 0.8],
  );
  for (const side of [-1, 1])
    add(
      spine,
      new Mesh(new BoxGeometry(0.035, 0.15, 0.012), satin),
      [side * 0.06, 0.6, 0.115],
      [0, 0, side * 0.45],
    );
  add(
    neck,
    new Mesh(new TorusGeometry(0.07, 0.01, 6, 18), shine),
    [0, 0.02, 0],
    [Math.PI / 2, 0, 0],
    [1, 1, 0.85],
  );
  add(
    hips,
    new Mesh(new CylinderGeometry(0.17, 0.22, 0.5, 18, 1, true), satin),
    [0, -0.05, 0],
    [0, 0, 0],
    [1, 1, 0.85],
  );
  add(
    hips,
    new Mesh(
      new CylinderGeometry(
        0.22,
        0.31,
        0.44,
        18,
        1,
        true,
        1.1,
        Math.PI * 2 - 0.85,
      ),
      satin,
    ),
    [0, -0.52, 0],
    [0, 0, 0],
    [1, 1, 0.85],
  );
  add(
    hips,
    new Mesh(new TorusGeometry(0.172, 0.008, 5, 24), shine),
    [0, 0.2, 0],
    [Math.PI / 2, 0, 0],
    [1, 0.85, 1],
  );
  const radius = 0.17 * zuriLook.headSize;
  head.add(buildHawk(radius));
  add(
    head,
    new Mesh(new SphereGeometry(1, 10, 6), lips),
    [0, -radius * 0.42, radius * 0.9],
    [0, 0, 0],
    [radius * 0.24, radius * 0.08, radius * 0.08],
  );
  for (const side of [-1, 1])
    add(
      head,
      new Mesh(new TorusGeometry(0.032, 0.005, 6, 16), shine),
      [side * radius * 0.98, -radius * 0.3, 0],
      [0, Math.PI / 2, 0],
    );
  for (const side of [0, 1]) {
    const forearm = joint(body, `forearm-${String(side)}`);
    add(
      forearm,
      new Mesh(new TorusGeometry(0.052, 0.009, 6, 16), shine),
      [0, -0.25, 0],
      [Math.PI / 2, 0, 0],
    );
    if (side === 0) {
      const ticket = add(
        forearm,
        new Mesh(new BoxGeometry(0.14, 0.006, 0.08), glow),
        [0, -0.36, 0.06],
        [1.2, 0, 0],
      );
      ticket.name = "gold-ticket";
    }
  }
  return body;
}
