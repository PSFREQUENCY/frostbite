import {
  BoxGeometry,
  CapsuleGeometry,
  Color,
  Group,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  SphereGeometry,
  Vector3,
} from "three";

import { underground } from "../rules/caves.ts";
import type { DayState } from "../rules/types.ts";
import { venues } from "../rules/venues.ts";
import { bazaarPlans } from "./bazaar.ts";
import { createBumps, type Mover } from "./bumps.ts";
import { hallPlans, type Plan } from "./insider-plans.ts";
import { placeOf, poseOf } from "./insider-poses.ts";

// The people inside the landmarks and the Underground Bazaar (`insider-plans.ts` and `bazaar.ts` say who and where), drawn only in the
// places near the hero: each a body, a head, two legs and two arms that swing as they walk, rise as they cheer and trade, bend to sit,
// and bounce to the music; a shopping bag in a shopper's hand; a board under a skater. Walked into, they stagger out of the way like the
// street's people (`bumps.ts`). Nothing here touches the rules.
export interface Insiders {
  readonly root: Group;
  show(state: DayState | null, mover: Mover | null, seconds: number): void;
}

export const people: readonly Plan[] = [...hallPlans, ...bazaarPlans];
const near = 52;
const hips = 0.9;
const shoulders = 1.48;

const matrix = new Matrix4();
const part = new Matrix4();
const turn = new Matrix4();
const spin = new Quaternion();
const tip = new Quaternion();
const axis = new Vector3();
const at = new Vector3();
const one = new Vector3(1, 1, 1);
const none = new Matrix4().makeScale(0, 0, 0);

export function buildInsiders(): Insiders {
  const root = new Group();
  root.name = "insiders";
  const cloth = new MeshStandardMaterial({ flatShading: true, roughness: 0.8 });
  const count = people.length;
  const mesh = (
    geometry: CapsuleGeometry | SphereGeometry | BoxGeometry,
    size: number,
    name: string,
  ) => {
    const made = new InstancedMesh(geometry, cloth, size);
    made.name = name;
    // The people move between places all over the city (and under it), so no one bounding sphere holds them.
    made.frustumCulled = false;
    root.add(made);
    return made;
  };
  const bodies = mesh(
    new CapsuleGeometry(0.19, 0.38, 3, 8),
    count,
    "insider-bodies",
  );
  const heads = mesh(new SphereGeometry(0.13, 10, 8), count, "insider-heads");
  const legs = mesh(
    new CapsuleGeometry(0.075, 0.72, 3, 6),
    count * 2,
    "insider-legs",
  );
  const arms = mesh(
    new CapsuleGeometry(0.055, 0.5, 3, 6),
    count * 2,
    "insider-arms",
  );
  const bags = mesh(new BoxGeometry(0.32, 0.36, 0.14), count, "insider-bags");
  const boards = mesh(
    new BoxGeometry(0.24, 0.05, 0.82),
    count,
    "insider-boards",
  );
  const paint = new Color();
  people.forEach((plan, index) => {
    bodies.setColorAt(index, paint.set(plan.coat));
    heads.setColorAt(index, paint.set(plan.skin));
    for (const side of [0, 1]) {
      legs.setColorAt(
        index * 2 + side,
        paint.set(plan.doing === "trade" ? "#2a2f45" : "#3a3f4d"),
      );
      arms.setColorAt(index * 2 + side, paint.set(plan.coat));
    }
    bags.setColorAt(
      index,
      paint.set(["#ff3df2", "#ffd166", "#5beac6"][index % 3] ?? "#ffd166"),
    );
    boards.setColorAt(index, paint.set("#ff7a1a"));
  });
  const all = [bodies, heads, legs, arms, bags, boards];
  for (const each of all)
    for (let k = 0; k < each.count; k += 1) each.setMatrixAt(k, none);
  const placed = createBumps(count);
  // Which places were drawn last time, to clear the people of one the hero has left.
  let shown = new Set<number>();
  const hide = (index: number): void => {
    for (const each of [bodies, heads, bags, boards])
      each.setMatrixAt(index, none);
    for (const side of [0, 1]) {
      legs.setMatrixAt(index * 2 + side, none);
      arms.setMatrixAt(index * 2 + side, none);
    }
  };
  // A limb from its joint (in the body's frame), swung forward or back and spread out, hanging its length below the joint.
  const limb = (
    target: InstancedMesh,
    slot: number,
    side: number,
    height: number,
    swing: number,
    spread: number,
    drop: number,
  ) => {
    turn.makeTranslation(side, height, 0);
    part.makeRotationX(swing);
    turn.multiply(part);
    part.makeRotationZ(spread * Math.sign(side));
    turn.multiply(part);
    part.makeTranslation(0, -drop, 0);
    turn.multiply(part);
    target.setMatrixAt(slot, part.multiplyMatrices(matrix, turn));
  };
  return {
    root,
    show(state, mover, seconds) {
      root.visible = state !== null;
      if (state === null) return;
      const below = underground(state.x, state.z);
      const [hx, hz] = [state.x / 100, state.z / 100];
      const active = new Set<number>(
        below
          ? [-1]
          : venues.flatMap((venue, index) =>
              Math.hypot(venue.middle.x / 100 - hx, venue.middle.z / 100 - hz) <
              near
                ? [index]
                : [],
            ),
      );
      people.forEach((plan, index) => {
        if (!active.has(plan.place)) {
          if (shown.has(plan.place)) hide(index);
          return;
        }
        const where = placeOf(plan, seconds);
        const pose = poseOf(plan, where.stride, seconds);
        // Only people on the hero's floor can be bumped into.
        const ground =
          Math.abs(where.y - plan.y) < 0.01 &&
          plan.doing !== "ride" &&
          plan.y < 2;
        const moved = placed(
          index,
          where.x,
          where.z,
          seconds,
          ground ? mover : null,
        );
        const lean = moved.tip?.lean ?? 0;
        tip.setFromAxisAngle(
          axis.set(moved.tip?.z ?? 0, 0, -(moved.tip?.x ?? 0)).normalize(),
          lean,
        );
        spin.setFromAxisAngle(axis.set(0, 1, 0), where.face);
        matrix.compose(
          at.set(moved.x, where.y + moved.lift + pose.bob - pose.sink, moved.z),
          tip.multiply(spin),
          one,
        );
        const skating = plan.doing === "skate";
        const lift = skating ? 0.1 : 0;
        part.makeTranslation(0, 1.18 + lift, 0);
        bodies.setMatrixAt(index, turn.multiplyMatrices(matrix, part));
        part.makeTranslation(0, 1.66 + lift, 0);
        heads.setMatrixAt(index, turn.multiplyMatrices(matrix, part));
        limb(legs, index * 2, -0.1, hips + lift, pose.legs[0], 0, 0.43);
        limb(legs, index * 2 + 1, 0.1, hips + lift, pose.legs[1], 0, 0.43);
        limb(
          arms,
          index * 2,
          -0.25,
          shoulders + lift,
          pose.arms[0],
          pose.spread,
          0.3,
        );
        limb(
          arms,
          index * 2 + 1,
          0.25,
          shoulders + lift,
          pose.arms[1],
          pose.spread,
          0.3,
        );
        if (plan.bag) {
          part.makeTranslation(0.36, 0.78, 0.05);
          bags.setMatrixAt(index, turn.multiplyMatrices(matrix, part));
        }
        if (skating) {
          part.makeTranslation(0, 0.08, 0);
          boards.setMatrixAt(index, turn.multiplyMatrices(matrix, part));
        }
      });
      shown = active;
      for (const each of all) each.instanceMatrix.needsUpdate = true;
    },
  };
}
