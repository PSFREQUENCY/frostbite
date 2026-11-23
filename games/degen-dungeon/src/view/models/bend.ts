import { Quaternion, Vector3, type Object3D } from "three";

import { seatAngles, type Seat } from "../body.ts";
import type { Pose } from "../poses.ts";

// The bones of a Frost Run model that a seat or a pose bends, found by the names the models give them (a loader may drop the dots): the
// body, each leg and shin (or foot), and each arm and forearm. A four-legged model's front legs serve as its arms and its back legs as its
// legs. Each bone keeps the turn it rests at, and a bend is put on top of that rest, about the bone's own sideways axis.
interface Held {
  readonly bone: Object3D;
  readonly rest: Quaternion;
}
export interface Bones {
  readonly arms: readonly (Held | null)[];
  readonly body: Held | null;
  readonly fores: readonly (Held | null)[];
  readonly legs: readonly (Held | null)[];
  // Four legs and no arms: the front legs reach for a wall, and the body tips up to climb it.
  readonly quadruped: boolean;
  readonly shins: readonly (Held | null)[];
}

const find = (model: Object3D, names: readonly string[]): Held | null => {
  for (const name of names) {
    const bone =
      model.getObjectByName(name) ??
      model.getObjectByName(name.replace(/([LR])$/u, ".$1"));
    if (bone !== undefined) return { bone, rest: bone.quaternion.clone() };
  }
  return null;
};
const sides = (model: Object3D, names: readonly string[]) =>
  ["L", "R"].map((side) =>
    find(
      model,
      names.map((name) => name + side),
    ),
  );

export function bonesOf(model: Object3D): Bones {
  const arms = sides(model, ["arm", "fleg"]);
  return {
    arms,
    body: find(model, ["body"]),
    fores: sides(model, ["fore", "fshin"]),
    legs: sides(model, ["leg", "bleg"]),
    quadruped: find(model, ["armL"]) === null && arms[0] !== null,
    shins: sides(model, ["shin", "foot", "bshin"]),
  };
}

const turn = new Quaternion();
const across = new Vector3(1, 0, 0);
const bend = (held: Held | null | undefined, angle: number): void => {
  held?.bone.quaternion
    .copy(held.rest)
    .multiply(turn.setFromAxisAngle(across, angle));
};

// A seat's pose (`seatAngles`), on top of whatever clip is playing.
export function bendSeat(
  bones: Bones,
  seat: Exclude<Seat, null>,
  crank: number,
): void {
  for (const side of [0, 1]) {
    const angles = seatAngles(seat, side, crank);
    bend(bones.legs[side], angles.hip);
    bend(bones.shins[side], angles.knee);
    bend(bones.arms[side], angles.shoulder);
    bend(bones.fores[side], angles.elbow);
  }
}

// A pose on foot (`poses.ts`): the limbs as it says, and the body leaning with it. A four-legged body on the ground bends all four legs
// alike, the front pair half a stride on; up a wall it reaches with its front legs and tips nose up.
export function bendPose(bones: Bones, pose: Pose, climbing: boolean): void {
  if (bones.quadruped && !climbing) {
    for (const side of [0, 1]) {
      const back = pose.legs[side] ?? pose.legs[0];
      const front = pose.legs[1 - side] ?? pose.legs[0];
      bend(bones.legs[side], back.hip);
      bend(bones.shins[side], back.knee);
      bend(bones.arms[side], front.hip);
      bend(bones.fores[side], front.knee);
    }
    bend(bones.body, 0);
    return;
  }
  for (const side of [0, 1]) {
    const leg = pose.legs[side] ?? pose.legs[0];
    const arm = pose.arms[side] ?? pose.arms[0];
    bend(bones.legs[side], leg.hip);
    bend(bones.shins[side], leg.knee);
    bend(bones.arms[side], arm.shoulder);
    bend(bones.fores[side], arm.elbow);
  }
  bend(bones.body, bones.quadruped ? (climbing ? -1.2 : 0) : pose.lean);
}

// A four-legged model's knees through its own run (its clip swings the legs from the hips and keeps the knees straight): each knee
// bends as its leg comes forward, the left and right half a stride apart and the front pair a quarter stride after the back.
export function bendStride(bones: Bones, phase: number): void {
  if (!bones.quadruped) return;
  for (const side of [0, 1]) {
    const back = phase + side * Math.PI;
    bend(bones.shins[side], 0.25 + 0.75 * Math.max(0, Math.sin(back)));
    bend(
      bones.fores[side],
      0.25 + 0.75 * Math.max(0, Math.sin(back + Math.PI / 2)),
    );
  }
}
