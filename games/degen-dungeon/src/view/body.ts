import {
  CapsuleGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  type Object3D,
} from "three";

import { addFeatures } from "./features.ts";
import type { Look } from "./looks.ts";
import { legReach, poseFor, type Way } from "./poses.ts";

// A body built in code, joint by joint, so every part can move: hips, two legs with knees, a spine and chest, a neck and head, two arms
// with elbows, and a tail for those who have one. The look (`looks.ts`) sets the size, the colours and what is on the head. Motion comes
// in layers each frame: the pose for what the body is doing (`poses.ts`: standing, walking, running, crouching, crawling, climbing,
// hanging, a jump's tuck), with the hips set down on whichever leg reaches lowest so the feet or knees stay on the ground; breathing and
// a slow look round while still, a blink every few seconds, and a nod while talking.
export interface Body {
  // Moves every joint for a pace (centimetres a tick, 0 standing), the clock, whether the body is in a conversation, how it rides, what
  // it is doing on foot, and how far through a jump it is (-1 on the ground).
  pose(
    pace: number,
    seconds: number,
    talking: boolean,
    seat?: Seat,
    way?: Way,
    air?: number,
  ): void;
  // How high the hips stand above the feet (metres), to sit a body on a seat.
  readonly hip: number;
  readonly root: Group;
}

// How a body rides: astride a saddle pedalling (a bike), astride with its feet up on pegs (a motorbike), in a seat with its knees bent
// (inside a car, minivan, pickup or cab), or standing on a deck with a hand on the bar (a scooter).
export type Seat = "deck" | "pedal" | "saddle" | "seat" | null;

// The joint angles (radians) of a ride's pose: hip, knee and a spread for each leg; shoulder and elbow for the arms; the lean forward.
// A pedalling body turns its legs round a crank, opposite each other.
export function seatAngles(
  seat: Exclude<Seat, null>,
  side: number,
  crank: number,
): {
  readonly elbow: number;
  readonly hip: number;
  readonly knee: number;
  readonly lean: number;
  readonly shoulder: number;
  readonly spread: number;
} {
  const turn = crank + (side === 0 ? 0 : Math.PI);
  const astride = seat === "pedal" || seat === "saddle";
  return {
    elbow: seat === "seat" ? -0.7 : -0.45,
    hip:
      seat === "deck"
        ? side === 0
          ? -0.2
          : 0.25
        : seat === "pedal"
          ? -1.0 + Math.sin(turn) * 0.4
          : seat === "saddle"
            ? -1.2
            : -1.45,
    knee:
      seat === "deck"
        ? 0.3
        : seat === "pedal"
          ? 1.05 + Math.cos(turn) * 0.45
          : seat === "saddle"
            ? 1.6
            : 1.4,
    lean: seat === "deck" ? 0.12 : seat === "seat" ? 0.04 : 0.34,
    shoulder: seat === "deck" ? -0.7 : seat === "seat" ? -0.75 : -1.0,
    spread: astride ? 0.14 : 0.04,
  };
}

interface Limb {
  readonly lower: Group;
  readonly upper: Group;
}

const materials = new Map<string, MeshStandardMaterial>();
// One material a colour, shared by every body that wears it.
export const paint = (colour: string, glow = false): MeshStandardMaterial => {
  const key = `${colour}${glow ? "!" : ""}`;
  const known = materials.get(key);
  if (known !== undefined) return known;
  const made = new MeshStandardMaterial({
    color: colour,
    emissive: glow ? colour : "#000000",
    emissiveIntensity: glow ? 0.8 : 0,
    flatShading: true,
    roughness: 0.7,
  });
  materials.set(key, made);
  return made;
};

const joint = (parent: Object3D, y: number, x = 0, z = 0): Group => {
  const group = new Group();
  group.position.set(x, y, z);
  parent.add(group);
  return group;
};
const bone = (
  parent: Object3D,
  radius: number,
  length: number,
  colour: string,
): Mesh => {
  const mesh = new Mesh(
    new CapsuleGeometry(radius, length, 3, 8),
    paint(colour),
  );
  mesh.position.y = -length / 2;
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
};

function limb(
  parent: Object3D,
  at: readonly [number, number, number],
  radius: number,
  length: number,
  colours: readonly [string, string],
): Limb {
  const upper = joint(parent, at[1], at[0], at[2]);
  bone(upper, radius, length / 2, colours[0]);
  const lower = joint(upper, -length / 2 - radius);
  bone(lower, radius * 0.85, length / 2, colours[1]);
  return { lower, upper };
}

export function buildBody(look: Look): Body {
  const root = new Group();
  const size = look.height / 1.7;
  const frame = joint(root, 0);
  frame.scale.setScalar(size);
  const leg = 0.72;
  const hips = joint(frame, leg + 0.1);
  const radius = 0.075 * look.bulk;
  const legs = [-1, 1].map((side) =>
    limb(hips, [side * 0.12 * look.bulk, 0, 0], radius, leg, [
      look.legs,
      look.legs,
    ]),
  );
  // The leg's measures for setting the hips down: hip to knee, knee to sole, the shin's thickness, and how far a straight leg reaches
  // past the hips' standing height (the sole sits that little into the ground).
  const thigh = leg / 2 + radius;
  const shin = leg / 2 + radius * 0.85;
  const thickness = radius * 0.85;
  const sink = thigh + shin - (leg + 0.1);
  const spine = joint(hips, 0.02);
  const torso = new Mesh(
    new CapsuleGeometry(0.2 * look.bulk, 0.34, 4, 10),
    paint(look.body),
  );
  torso.position.y = 0.3;
  torso.scale.set(1, 1, 0.75);
  torso.castShadow = true;
  spine.add(torso);
  const neck = joint(spine, 0.62);
  const head = joint(neck, 0.16);
  const skull = new Mesh(
    new SphereGeometry(0.17 * look.headSize, 12, 10),
    paint(look.coat),
  );
  skull.castShadow = true;
  head.add(skull);
  const eyes = addFeatures(head, look).map((eye) => ({
    eye,
    open: eye.scale.y,
  }));
  const arms = [-1, 1].map((side) =>
    limb(spine, [side * (0.27 * look.bulk), 0.55, 0], 0.06 * look.bulk, 0.56, [
      look.body,
      look.coat,
    ]),
  );
  const tail = look.tail === undefined ? null : joint(hips, 0, 0, -0.16);
  if (tail !== null && look.tail !== undefined) {
    const piece = bone(tail, 0.04, 0.42, look.tail);
    piece.rotation.x = Math.PI / 2.6;
  }

  // On a ride: the legs and arms set by the seat, the body leaning in, breathing and blinking as ever.
  const ride = (
    seat: Exclude<Seat, null>,
    pace: number,
    seconds: number,
    talking: boolean,
  ): void => {
    const crank = seconds * (pace > 0 ? 3 + pace * 0.25 : 0.4);
    legs.forEach((one, side) => {
      const angles = seatAngles(seat, side, crank);
      one.upper.rotation.x = angles.hip;
      one.upper.rotation.z = (side === 0 ? -1 : 1) * angles.spread;
      one.lower.rotation.x = angles.knee;
    });
    arms.forEach((one, side) => {
      const angles = seatAngles(seat, side, crank);
      one.upper.rotation.x = angles.shoulder;
      one.upper.rotation.z = (side === 0 ? 1 : -1) * 0.1;
      one.lower.rotation.x = angles.elbow;
    });
    const angles = seatAngles(seat, 0, crank);
    hips.position.y = leg + 0.1;
    spine.rotation.set(angles.lean, 0, 0);
    neck.rotation.set(
      talking ? Math.sin(seconds * 6) * 0.08 : -angles.lean * 0.6,
      0,
      0,
    );
    const breath = Math.sin(seconds * 2.1) * 0.015;
    torso.scale.set(1 + breath, 1 + breath, 0.75 + breath);
    const blink = seconds % 4.3 < 0.12 ? 0.1 : 1;
    for (const { eye, open } of eyes) eye.scale.y = open * blink;
  };

  return {
    hip: (leg + 0.1) * size,
    pose(pace, seconds, talking, seat = null, way = "upright", air = -1) {
      if (seat !== null) {
        ride(seat, pace, seconds, talking);
        return;
      }
      const pose = poseFor(way, pace, seconds, air);
      legs.forEach((one, side) => {
        const angles = pose.legs[side] ?? pose.legs[0];
        one.upper.rotation.x = angles.hip;
        one.upper.rotation.z = (side === 0 ? -1 : 1) * angles.spread;
        one.lower.rotation.x = angles.knee;
      });
      arms.forEach((one, side) => {
        const angles = pose.arms[side] ?? pose.arms[0];
        one.upper.rotation.x = angles.shoulder;
        one.upper.rotation.z = (side === 0 ? -1 : 1) * angles.out;
        one.lower.rotation.x = angles.elbow;
      });
      // Standing straight the hips are where they always were; on bent legs they come down to the lowest foot or knee.
      hips.position.y = pose.planted
        ? Math.max(
            ...pose.legs.map((one) => legReach(one, thigh, shin, thickness)),
          ) - sink
        : leg + 0.1;
      spine.rotation.set(pose.lean, pose.twist, 0);
      const breath = Math.sin(seconds * 2.1) * 0.015;
      torso.scale.set(1 + breath, 1 + breath, 0.75 + breath);
      const still = pace === 0 && way === "upright";
      neck.rotation.set(
        pose.neck + (talking ? Math.sin(seconds * 6) * 0.08 : 0),
        -pose.twist * 0.75 + (still ? Math.sin(seconds * 0.4) * 0.25 : 0),
        0,
      );
      const blink = seconds % 4.3 < 0.12 ? 0.1 : 1;
      for (const { eye, open } of eyes) eye.scale.y = open * blink;
      if (tail !== null) tail.rotation.y = Math.sin(seconds * 3) * 0.4;
    },
    root,
  };
}
