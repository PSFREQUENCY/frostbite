import {
  AnimationMixer,
  Box3,
  Group,
  LoopOnce,
  Mesh,
  Vector3,
  type AnimationAction,
  type AnimationClip,
  type MeshStandardMaterial,
  type Object3D,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";

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
  readonly root: Group;
  update(pace: number, dt: number, cheering: boolean): void;
}

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
  return {
    root,
    update(pace, dt, cheering) {
      play(cheering ? "Win" : pace > 0 ? "Run" : "Idle");
      if (current !== null)
        current.timeScale = pace > 0 ? Math.max(0.6, pace / 14) : 1;
      mixer.update(dt);
    },
  };
}
