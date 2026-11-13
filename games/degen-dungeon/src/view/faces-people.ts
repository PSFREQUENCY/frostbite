import type { Group } from "three";

import type { Look } from "./looks.ts";
import { part } from "./parts.ts";

// The other heads: a miner's lamp, an ice beard, a wizard's hat, a robot's screen, the tux's shades, a cop's cap, plain hair.
export function peopleFace(head: Group, look: Look, r: number): void {
  const t = look.trim;
  switch (look.face) {
    case "miner":
      part(
        head,
        "ball",
        "#3d3570",
        [r * 1.08, r * 0.7, r * 1.08],
        [0, r * 0.35, 0],
      );
      part(
        head,
        "rod",
        t,
        [r * 0.18, r * 0.12, r * 0.18],
        [0, r * 0.6, r * 0.95],
        [Math.PI / 2, 0, 0],
        true,
      );
      return;
    case "giant":
      part(
        head,
        "cone",
        t,
        [r * 0.7, r * 1.2, r * 0.5],
        [0, -r * 1.0, r * 0.45],
        [Math.PI, 0, 0],
      );
      part(
        head,
        "box",
        t,
        [r * 1.5, r * 0.18, r * 0.4],
        [0, r * 0.45, r * 0.75],
      );
      return;
    case "wizard":
      part(
        head,
        "rod",
        look.body,
        [r * 1.6, r * 0.08, r * 1.6],
        [0, r * 0.7, 0],
      );
      part(
        head,
        "cone",
        look.body,
        [r * 0.85, r * 2.4, r * 0.85],
        [0, r * 1.9, 0],
        [-0.15, 0, 0],
      );
      part(
        head,
        "ball",
        t,
        [r * 0.15, r * 0.15, r * 0.15],
        [0, r * 1.6, r * 0.5],
        [0, 0, 0],
        true,
      );
      part(
        head,
        "cone",
        "#e8e8f0",
        [r * 0.55, r * 1.3, r * 0.4],
        [0, -r * 1.0, r * 0.55],
        [Math.PI, 0, 0],
      );
      return;
    case "robot":
      part(head, "box", look.body, [r * 2.0, r * 1.6, r * 1.7], [0, 0, 0]);
      part(
        head,
        "rod",
        t,
        [r * 0.05, r * 0.6, r * 0.05],
        [0, r * 1.1, 0],
        [0, 0, 0],
        true,
      );
      return;
    case "shades":
      part(
        head,
        "box",
        "#05060a",
        [r * 1.3, r * 0.22, r * 0.12],
        [0, r * 0.15, r * 0.92],
      );
      return;
    case "cap":
      part(
        head,
        "rod",
        look.body,
        [r * 1.0, r * 0.4, r * 1.0],
        [0, r * 0.75, 0],
      );
      part(
        head,
        "box",
        "#11131c",
        [r * 1.1, r * 0.06, r * 0.6],
        [0, r * 0.55, r * 0.7],
      );
      return;
    case "person":
      part(
        head,
        "ball",
        look.hair ?? "#3a2a20",
        [r * 1.02, r * 0.6, r * 1.02],
        [0, r * 0.4, -r * 0.05],
      );
      return;
    default:
      return;
  }
}
