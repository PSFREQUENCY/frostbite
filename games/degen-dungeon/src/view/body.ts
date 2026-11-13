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

// A body built in code, joint by joint, so every part can move: hips, two legs with knees, a spine and chest, a neck and head, two arms
// with elbows, and a tail for those who have one. The look (`looks.ts`) sets the size, the colours and what is on the head. Motion comes
// in layers each frame: a walk or run from the pace (stride, knee bend, arm swing, a bob and a sway), breathing and a slow weight shift
// while still, a blink every few seconds, and a nod while talking.
export interface Body {
  // Moves every joint for a pace (centimetres a tick, 0 standing), the clock, and whether the body is in a conversation.
  pose(pace: number, seconds: number, talking: boolean): void;
  readonly root: Group;
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
  const legs = [-1, 1].map((side) =>
    limb(hips, [side * 0.12 * look.bulk, 0, 0], 0.075 * look.bulk, leg, [
      look.legs,
      look.legs,
    ]),
  );
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

  return {
    pose(pace, seconds, talking) {
      const moving = Math.min(1, pace / 14);
      const step = seconds * (4 + pace * 0.35);
      const swing = Math.sin(step) * 0.7 * moving;
      legs.forEach((one, side) => {
        const phase = side === 0 ? swing : -swing;
        one.upper.rotation.x = phase;
        one.lower.rotation.x =
          Math.max(0, -Math.sin(step + (side === 0 ? 0 : Math.PI))) *
          0.9 *
          moving;
      });
      arms.forEach((one, side) => {
        const phase = side === 0 ? -swing : swing;
        one.upper.rotation.x = phase * 0.8;
        one.upper.rotation.z =
          (side === 0 ? -1 : 1) * (0.08 + 0.03 * Math.sin(seconds * 1.3));
        one.lower.rotation.x = -0.25 - 0.35 * moving;
      });
      const breath = Math.sin(seconds * 2.1) * 0.015;
      hips.position.y = leg + 0.1 + Math.abs(Math.cos(step)) * 0.05 * moving;
      spine.rotation.y = swing * 0.2;
      spine.rotation.x = 0.08 * moving;
      torso.scale.set(1 + breath, 1 + breath, 0.75 + breath);
      neck.rotation.y =
        -swing * 0.15 + (moving === 0 ? Math.sin(seconds * 0.4) * 0.25 : 0);
      neck.rotation.x = talking ? Math.sin(seconds * 6) * 0.08 : 0;
      const blink = seconds % 4.3 < 0.12 ? 0.1 : 1;
      for (const { eye, open } of eyes) eye.scale.y = open * blink;
      if (tail !== null) tail.rotation.y = Math.sin(seconds * 3) * 0.4;
    },
    root,
  };
}
