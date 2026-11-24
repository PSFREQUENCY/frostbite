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
import { rooms } from "../rules/rooms.ts";
import { venues } from "../rules/venues.ts";
import { centreOf } from "../rules/world.ts";
import { bazaarPlans } from "./bazaar.ts";
import { createBumps, type Mover } from "./bumps.ts";
import { hallPlans, type Plan } from "./insider-plans.ts";
import { placeOf, poseOf, there } from "./insider-poses.ts";
import { pumpPeriod, shopPlans, streetPlans } from "./shop-plans.ts";

// The people inside the landmarks, the Underground Bazaar, the walk-in shops and on the streets (`insider-plans.ts`, `bazaar.ts` and
// `shop-plans.ts` say who and where), drawn only in the places near the hero: each a body, a head, two legs and two arms that swing as they walk, rise as they cheer and trade, bend to sit,
// and bounce to the music; a shopping bag in a shopper's hand; a board under a skater. Walked into, they stagger out of the way like the
// street's people (`bumps.ts`). Nothing here touches the rules.
export interface Insiders {
  readonly root: Group;
  show(state: DayState | null, mover: Mover | null, seconds: number): void;
}

export const people: readonly Plan[] = [
  ...hallPlans,
  ...bazaarPlans,
  ...shopPlans,
  ...streetPlans,
];
// Where a place is (metres) and how near the hero must be for its people to be drawn: a landmark, a walk-in shop, a borough's streets.
// The bazaar's are drawn while the hero is underground.
export function anchorOf(place: number): readonly [number, number, number] {
  if (place >= 2_000) {
    const { x, z } = centreOf(place - 2_000);
    return [x / 100, z / 100, 75];
  }
  if (place >= 1_000) {
    const room = rooms[place - 1_000]?.room;
    return room === undefined
      ? [0, 0, 0]
      : [(room.x0 + room.x1) / 200, (room.z0 + room.z1) / 200, 40];
  }
  const venue = venues[place];
  return venue === undefined
    ? [0, 0, 0]
    : [venue.middle.x / 100, venue.middle.z / 100, 52];
}
const anchors = new Map(
  [...new Set(people.map(({ place }) => place))].map((place) => [
    place,
    anchorOf(place),
  ]),
);
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
  const placed = createBumps(count);
  // Only the people of places near the hero are drawn, packed into the first slots each frame (with their colours), so the far ones cost
  // the picture nothing; bags and boards fill their own slots.
  const dress = (slot: number, plan: Plan): void => {
    bodies.setColorAt(slot, paint.set(plan.coat));
    heads.setColorAt(slot, paint.set(plan.skin));
    for (const side of [0, 1]) {
      legs.setColorAt(
        slot * 2 + side,
        paint.set(plan.doing === "trade" ? "#2a2f45" : "#3a3f4d"),
      );
      arms.setColorAt(slot * 2 + side, paint.set(plan.coat));
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
          : [...anchors].flatMap(([place, [ax, az, reach]]) =>
              place >= 0 && Math.hypot(ax - hx, az - hz) < reach ? [place] : [],
            ),
      );
      let slot = 0;
      let bagged = 0;
      let boarded = 0;
      people.forEach((plan, index) => {
        if (!active.has(plan.place) || !there(plan, seconds, pumpPeriod))
          return;
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
        dress(slot, plan);
        part.makeTranslation(0, 1.18 + lift, 0);
        bodies.setMatrixAt(slot, turn.multiplyMatrices(matrix, part));
        part.makeTranslation(0, 1.66 + lift, 0);
        heads.setMatrixAt(slot, turn.multiplyMatrices(matrix, part));
        limb(legs, slot * 2, -0.1, hips + lift, pose.legs[0], 0, 0.43);
        limb(legs, slot * 2 + 1, 0.1, hips + lift, pose.legs[1], 0, 0.43);
        limb(
          arms,
          slot * 2,
          -0.25,
          shoulders + lift,
          pose.arms[0],
          pose.spread,
          0.3,
        );
        limb(
          arms,
          slot * 2 + 1,
          0.25,
          shoulders + lift,
          pose.arms[1],
          pose.spread,
          0.3,
        );
        slot += 1;
        if (plan.bag) {
          part.makeTranslation(0.36, 0.78, 0.05);
          bags.setMatrixAt(bagged, turn.multiplyMatrices(matrix, part));
          bags.setColorAt(
            bagged,
            paint.set(
              ["#ff3df2", "#ffd166", "#5beac6"][index % 3] ?? "#ffd166",
            ),
          );
          bagged += 1;
        }
        if (skating) {
          part.makeTranslation(0, 0.08, 0);
          boards.setMatrixAt(boarded, turn.multiplyMatrices(matrix, part));
          boards.setColorAt(boarded, paint.set("#ff7a1a"));
          boarded += 1;
        }
      });
      for (const [each, drawn] of [
        [bodies, slot],
        [heads, slot],
        [legs, slot * 2],
        [arms, slot * 2],
        [bags, bagged],
        [boards, boarded],
      ] as const) {
        each.count = drawn;
        each.instanceMatrix.needsUpdate = true;
        if (each.instanceColor !== null) each.instanceColor.needsUpdate = true;
      }
    },
  };
}
