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

import { heightOf, type Actor } from "../actor.ts";
import type { Seat } from "../body.ts";
import { jumpLength } from "../hop.ts";
import { legReach, poseFor, type Way } from "../poses.ts";
import { bendPose, bendSeat, bendStride, bonesOf } from "./bend.ts";
import { modelNames, packed, type ModelName } from "./packed.ts";
import { holo, pulse, spirit, standard } from "./shaders.ts";

// Frost Run's heroes as Blender made them, read from the text they were packed into (the frame may load no files), finished with the same
// shader looks, and played with their own clips: Idle standing, Run on the move, Duck crouching, Hop in a jump, Select on the hero ring,
// Win at a good end. Crawling, climbing and hanging bend their bones by the same poses as the bodies built in code (`bend.ts`).
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

// Puts each hero's model on once the models have arrived, and keeps them (by name) for whoever else wears one, such as a newbie self.
export function dress(
  cast: readonly Actor[],
  all: ReadonlyMap<ModelName, Model>,
  loaded: Map<ModelName, Model>,
): void {
  for (const [name, model] of all) loaded.set(name, model);
  cast.forEach((actor, hero) => {
    const name = modelOf[hero];
    const model = name == null ? undefined : all.get(name);
    if (model !== undefined) actor.wear(rigged(model, heightOf(hero)));
  });
}

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
  update(
    pace: number,
    dt: number,
    cheering: boolean,
    seat?: Seat,
    way?: Way,
    air?: number,
  ): void;
}

// A code-built body's straight leg (hip to sole, in its own units), against which a bent pose's drop is measured.
const straight = 0.86;
// The clip for what a model is doing on foot, by its way, its pace and whether it is in the air.
export const clipFor = (
  way: Way,
  pace: number,
  air: number,
  quadruped: boolean,
): string =>
  way === "fly"
    ? "Hover"
    : way === "climb" || way === "hang"
      ? "Idle"
      : air >= 0
        ? "Hop"
        : way === "crouch" || (way === "crawl" && !quadruped)
          ? "Duck"
          : pace > 0
            ? "Run"
            : "Idle";

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
  // The bones a seat or a pose bends, each with its resting turn, found once; how long the jump's clip is, to fit it to a jump.
  const bones = bonesOf(body);
  const hop = actions.get("Hop")?.getClip().duration ?? jumpLength;
  const stride = actions.get("Run")?.getClip().duration ?? 0.6;
  const resting = body.position.y;
  const hip = height * 0.48;
  let clock = 0;
  return {
    hip,
    root,
    update(pace, dt, cheering, seat = null, way = "upright", air = -1) {
      const clip = cheering
        ? "Win"
        : seat === null
          ? clipFor(way, pace, air, bones.quadruped)
          : "Idle";
      play(clip);
      if (current !== null)
        current.timeScale =
          clip === "Hop"
            ? hop / jumpLength
            : pace > 0 && clip === "Run"
              ? Math.max(0.4, pace / 14)
              : 1;
      mixer.update(dt);
      clock += dt;
      body.position.y = resting;
      if (clip === "Run" && current !== null)
        bendStride(bones, (current.time / stride) * Math.PI * 2);
      if (seat !== null) {
        const crank = clock * (pace > 0 ? 3 + pace * 0.25 : 0.4);
        if (!bones.quadruped) bendSeat(bones, seat, crank);
        return;
      }
      if (way !== "climb" && way !== "hang" && way !== "crawl") return;
      // A four-legged model crawls as a built body crouches, on all four legs.
      const pose = poseFor(
        way === "crawl" && bones.quadruped ? "crouch" : way,
        pace,
        clock,
        air,
      );
      bendPose(bones, pose, way !== "crawl");
      // On hands and knees the hips come down as far as a built body's would, for the model's own hip height.
      if (pose.planted)
        body.position.y =
          resting -
          hip *
            (1 -
              Math.max(
                ...pose.legs.map((leg) => legReach(leg, 0.435, 0.424, 0.064)),
              ) /
                straight);
    },
  };
}
