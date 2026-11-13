import type { Group, Mesh } from "three";

import { animalFace } from "./faces-animals.ts";
import { peopleFace } from "./faces-people.ts";
import type { Look } from "./looks.ts";
import { part } from "./parts.ts";

// Adds the head's parts and its eyes, and hands back the eyes so the body can blink them.
export function addFeatures(head: Group, look: Look): readonly Mesh[] {
  const r = 0.17 * look.headSize;
  const robot = look.face === "robot";
  const eyes = [-1, 1].map((side) =>
    part(
      head,
      "ball",
      robot ? look.trim : "#11131c",
      [r * 0.13, r * 0.18, r * 0.08],
      [side * r * 0.36, r * 0.15, r * 0.9],
      [0, 0, 0],
      robot,
    ),
  );
  animalFace(head, look, r);
  peopleFace(head, look, r);
  return eyes;
}
