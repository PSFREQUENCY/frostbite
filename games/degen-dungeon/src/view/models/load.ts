import {
  AnimationMixer,
  Box3,
  Group,
  LoopOnce,
  Mesh,
  Quaternion,
  Vector3,
  type AnimationAction,
  type AnimationClip,
  type MeshStandardMaterial,
  type Object3D,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";

import { seatAngles, type Seat } from "../body.ts";
import { modelNames, packed, type ModelName } from "./packed.ts";
import { holo, pulse, spirit, standard } from "./shaders.ts";

// Frost Run's heroes as Blender made them, read from the text they were packed into (the frame may load no files), finished with the same
// shader looks, and played with their own clips: Idle standing, Run on the move, Select on the hero ring, Win at a good end.
export interface Model {
  readonly clips: readonly AnimationClip[];
  readonly scene: Object3D;
}

// Which hero wears which model; the rest are built in code.
export const modelOf: readonly (ModelName | null)[] = [
  "hero-volt",
  "hero-nib",
  "hero-lumen",
  "hero-hrimm",
];

function bytesOf(text: string): ArrayBuffer {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let at = 0; at < binary.length; at += 1)
    bytes[at] = binary.charCodeAt(at);
  return bytes.buffer;
}

const glow = (material: MeshStandardMaterial): void =>
  pulse(material, "degen-gem", 2.2, 0.35);
const looks: Readonly<
  Record<string, (material: MeshStandardMaterial) => void>
> = {
  holo_body: holo,
  holo_face: holo,
  holo_hoof: holo,
  holo_horn: holo,
  holo_wool: holo,
  miner_lamp: glow,
  spirit_body: spirit,
  spirit_face: spirit,
};

function finish(scene: Object3D): void {
  const seen = new Set<string>();
  scene.traverse((part) => {
    if (!(part instanceof Mesh)) return;
    part.castShadow = true;
    const materials = Array.isArray(part.material)
      ? part.material
      : [part.material];
    for (const each of materials) {
      const material = standard(each);
      if (material === null || seen.has(material.uuid)) continue;
      seen.add(material.uuid);
      looks[material.name]?.(material);
    }
  });
}

export async function loadModels(): Promise<ReadonlyMap<ModelName, Model>> {
  const loader = new GLTFLoader();
  const entries = await Promise.all(
    modelNames.map(async (name) => {
      const gltf = await loader.parseAsync(bytesOf(packed[name]), "");
      finish(gltf.scene);
      return [name, { clips: gltf.animations, scene: gltf.scene }] as const;
    }),
  );
  return new Map(entries);
}

export interface Rigged {
  // How high the hips stand above the feet (metres).
  readonly hip: number;
  readonly root: Group;
  update(pace: number, dt: number, cheering: boolean, seat?: Seat): void;
}

// The bones a seat bends, by the names the models give them (a loader drops the dots), and which of the seat's angles each takes.
const bent: readonly (readonly [
  string,
  "elbow" | "hip" | "knee" | "shoulder",
  number,
])[] = [
  ["legL", "hip", 0],
  ["legR", "hip", 1],
  ["shinL", "knee", 0],
  ["shinR", "knee", 1],
  ["footL", "knee", 0],
  ["footR", "knee", 1],
  ["armL", "shoulder", 0],
  ["armR", "shoulder", 1],
  ["foreL", "elbow", 0],
  ["foreR", "elbow", 1],
];
const turn = new Quaternion();
const across = new Vector3(1, 0, 0);

// One copy of a model, stood up to a height in metres and facing along its root's +z, with its clips blended by what it is doing.
export function rigged(model: Model, height: number): Rigged {
  const root = new Group();
  const body = clone(model.scene);
  const box = new Box3().setFromObject(body);
  const size = box.getSize(new Vector3());
  body.scale.setScalar(height / Math.max(0.01, size.y));
  body.position.y = -box.min.y * body.scale.y;
  root.add(body);
  const mixer = new AnimationMixer(body);
  const actions = new Map<string, AnimationAction>();
  for (const clip of model.clips)
    actions.set(clip.name, mixer.clipAction(clip));
  const win = actions.get("Win");
  win?.setLoop(LoopOnce, 1);
  if (win !== undefined) win.clampWhenFinished = true;
  let current: AnimationAction | null = null;
  const play = (name: string): void => {
    const next = actions.get(name) ?? actions.get("Idle");
    if (next === undefined || next === current) return;
    next.reset().play();
    if (current !== null) current.crossFadeTo(next, 0.2, false);
    current = next;
  };
  play("Idle");
  // Each bone a seat bends, with its resting turn, found once.
  const bones = bent.flatMap(([name, angle, side]) => {
    const bone =
      body.getObjectByName(name) ??
      body.getObjectByName(name.replace(/([LR])$/, ".$1"));
    return bone === undefined
      ? []
      : [{ angle, bone, rest: bone.quaternion.clone(), side }];
  });
  let clock = 0;
  return {
    hip: height * 0.48,
    root,
    update(pace, dt, cheering, seat = null) {
      play(cheering ? "Win" : pace > 0 && seat === null ? "Run" : "Idle");
      if (current !== null)
        current.timeScale = pace > 0 ? Math.max(0.6, pace / 14) : 1;
      mixer.update(dt);
      clock += dt;
      if (seat === null) return;
      const crank = clock * (pace > 0 ? 3 + pace * 0.25 : 0.4);
      for (const { angle, bone, rest, side } of bones)
        bone.quaternion
          .copy(rest)
          .multiply(
            turn.setFromAxisAngle(across, seatAngles(seat, side, crank)[angle]),
          );
    },
  };
}
