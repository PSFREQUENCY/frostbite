import {
  AdditiveBlending,
  BackSide,
  Color,
  CylinderGeometry,
  DataTexture,
  DoubleSide,
  FrontSide,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  OctahedronGeometry,
  PlaneGeometry,
  Quaternion,
  RGBAFormat,
  Sprite,
  SpriteMaterial,
  Vector3,
  type Object3D,
} from "three";

// Neon for what can be picked up, bought or borrowed, worn by the thing itself: its own shapes again a little bigger, seen from behind in
// a colour that adds light, so each edge reads as a lit tube; a soft halo of the same light round it, standing in for the bloom a phone
// cannot afford; sparkles circling it; a beam of light standing up out of a pickup; and under a ride, a pool of light on the road. All of
// it pulses together, unlit by the sun.
export interface NeonLook {
  readonly colour: string;
  // The middle of the glow in the thing's own space (metres), and where in its pulse it starts.
  readonly at?: readonly [number, number, number];
  readonly phase?: number;
  // How thick the lit edge is (metres), and which of the thing's meshes have one (all of them unless said).
  readonly edge?: number;
  readonly edged?: (mesh: Mesh) => boolean;
  // The halo's width; how many sparkles, their colour (paler than the light unless said) and the circle they turn on; the pool of light
  // under a ride (across and along).
  readonly halo?: number;
  readonly sparkles?: number;
  readonly glint?: string;
  readonly ring?: number;
  readonly pool?: readonly [number, number];
  // A beam of light standing up out of it, this tall (metres), seen from afar.
  readonly beam?: number;
}
export interface Neon {
  readonly root: Group;
  // Draws the pulse at this moment, at a strength from 0 (dark) to 1.
  show(seconds: number, strength?: number): void;
}

const side = 64;
// A round light, white, its strength at each distance from the middle (0) to the rim (1) set by `shape`; whatever wears it tints it.
const round = (shape: (out: number) => number): DataTexture => {
  const data = new Uint8Array(side * side * 4).fill(255);
  for (let y = 0; y < side; y += 1)
    for (let x = 0; x < side; x += 1) {
      const out = Math.min(
        1,
        Math.hypot(x + 0.5 - side / 2, y + 0.5 - side / 2) / (side / 2),
      );
      data[(y * side + x) * 4 + 3] = Math.round(
        255 * Math.max(0, Math.min(1, shape(out))),
      );
    }
  const map = new DataTexture(data, side, side, RGBAFormat);
  map.needsUpdate = true;
  return map;
};
// A halo, brightest in the middle and fading fast; and a pool of light on the road, broad and even, soft only at its rim.
export const glowMap = round((out) => (1 - out) ** 2);
export const poolMap = round((out) => 1 - out ** 2);
// A beam of light, full at its foot and fading to nothing at its top.
export const beamMap: DataTexture = (() => {
  const tall = 32;
  const data = new Uint8Array(tall * 4).fill(255);
  for (let y = 0; y < tall; y += 1)
    data[y * 4 + 3] = Math.round(255 * (1 - y / (tall - 1)) ** 1.5);
  const map = new DataTexture(data, 1, tall, RGBAFormat);
  map.needsUpdate = true;
  return map;
})();

// Light that adds to what is behind it and is never dimmed by the sun or the night.
export const lightOf = (
  colour: string,
  back = false,
  map: DataTexture | null = null,
): MeshBasicMaterial =>
  new MeshBasicMaterial({
    blending: AdditiveBlending,
    color: colour,
    depthWrite: false,
    map,
    side: back ? BackSide : FrontSide,
    toneMapped: false,
    transparent: true,
  });
// A colour halfway to white, for what sparkles.
export const paler = (colour: string): Color =>
  new Color(colour).lerp(new Color("#ffffff"), 0.5);

const spark = new OctahedronGeometry(0.06, 0);
export const flat = new PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
const matrix = new Matrix4();
const turn = new Quaternion();
const where = new Vector3();
const grow = new Vector3();
const upward = new Vector3(0, 1, 0);

// Each of the thing's meshes wrapped in a hull `edge` metres bigger on every side, in the thing's own space.
function edges(
  thing: Object3D,
  edge: number,
  keep: (mesh: Mesh) => boolean,
  material: MeshBasicMaterial,
): number {
  const meshes: Mesh[] = [];
  thing.traverse((part) => {
    if (part instanceof Mesh && !(part instanceof InstancedMesh) && keep(part))
      meshes.push(part);
  });
  for (const mesh of meshes) {
    mesh.geometry.computeBoundingBox();
    const box = mesh.geometry.boundingBox;
    if (box === null) continue;
    // How big the mesh is in the thing's space: its own scale and its parents' up to the thing.
    const scaled = new Vector3(1, 1, 1);
    for (
      let part: Object3D | null = mesh;
      part !== null && part !== thing;
      part = part.parent
    )
      scaled.multiply(part.scale);
    const size = box.getSize(new Vector3()).multiply(scaled);
    const middle = box.getCenter(new Vector3());
    const stretch = (length: number): number =>
      Math.abs(length) > 1e-6
        ? (Math.abs(length) + 2 * edge) / Math.abs(length)
        : 1;
    const hull = new Mesh(mesh.geometry, material);
    hull.name = "neon-edge";
    hull.scale.set(stretch(size.x), stretch(size.y), stretch(size.z));
    hull.position.set(
      middle.x * (1 - hull.scale.x),
      middle.y * (1 - hull.scale.y),
      middle.z * (1 - hull.scale.z),
    );
    hull.renderOrder = 2;
    mesh.add(hull);
  }
  return meshes.length;
}

export function addNeon(thing: Object3D, look: NeonLook): Neon {
  const root = new Group();
  root.name = "neon";
  const [x, y, z] = look.at ?? [0, 0, 0];
  const phase = look.phase ?? 0;
  const edge = lightOf(look.colour, true);
  const edged =
    (look.edge ?? 0) > 0
      ? edges(thing, look.edge ?? 0, look.edged ?? (() => true), edge)
      : 0;
  const width = look.halo ?? 0;
  const halo = new Sprite(
    new SpriteMaterial({
      blending: AdditiveBlending,
      color: look.colour,
      depthWrite: false,
      map: glowMap,
      toneMapped: false,
      transparent: true,
    }),
  );
  halo.name = "neon-halo";
  halo.position.set(x, y, z);
  if (width > 0) root.add(halo);
  const count = look.sparkles ?? 0;
  const ring = look.ring ?? width * 0.4;
  const sparkles = new InstancedMesh(
    spark,
    new MeshBasicMaterial({
      color: look.glint === undefined ? paler(look.colour) : look.glint,
      toneMapped: false,
    }),
    Math.max(1, count),
  );
  sparkles.name = "neon-sparkles";
  sparkles.frustumCulled = false;
  if (count > 0) root.add(sparkles);
  const pool = new Mesh(flat, lightOf(look.colour, false, poolMap));
  pool.name = "neon-pool";
  if (look.pool !== undefined) {
    const [across, along] = look.pool;
    pool.scale.set(across, 1, along);
    pool.position.y = 0.04;
    root.add(pool);
  }
  const tall = look.beam ?? 0;
  const beam = new Mesh(
    new CylinderGeometry(0.1, 0.22, tall, 12, 1, true),
    lightOf(look.colour, false, beamMap),
  );
  beam.name = "neon-beam";
  beam.material.side = DoubleSide;
  if (tall > 0) {
    beam.position.set(x, y + tall / 2, z);
    root.add(beam);
  }
  thing.add(root);
  return {
    root,
    show(seconds, strength = 1) {
      const beat = 0.5 + 0.5 * Math.sin(seconds * 3 + phase);
      edge.opacity = edged > 0 ? strength * (0.5 + 0.5 * beat) : 0;
      halo.material.opacity = strength * (0.55 + 0.4 * beat);
      beam.material.opacity = strength * (0.35 + 0.25 * beat);
      halo.scale.setScalar(width * (0.9 + 0.15 * beat));
      pool.material.opacity = strength * (0.45 + 0.3 * beat);
      for (let index = 0; index < count; index += 1) {
        const angle = seconds * 1.3 + phase + (index * Math.PI * 2) / count;
        where.set(
          x + Math.cos(angle) * ring,
          y + Math.sin(seconds * 2.3 + index * 1.7) * ring * 0.3,
          z + Math.sin(angle) * ring,
        );
        const twinkle = Math.max(
          0,
          strength * (0.4 + 0.9 * Math.sin(seconds * 5 + index * 2.1)),
        );
        turn.setFromAxisAngle(upward, seconds * 4 + index);
        sparkles.setMatrixAt(
          index,
          matrix.compose(where, turn, grow.setScalar(twinkle)),
        );
      }
      sparkles.instanceMatrix.needsUpdate = true;
    },
  };
}
