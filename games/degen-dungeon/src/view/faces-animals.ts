import type { Group } from "three";

import type { Look } from "./looks.ts";
import { both, part } from "./parts.ts";

// The animal heads: horns, ears, snouts, a mane and a horn, placed by the size of the head.
export function animalFace(head: Group, look: Look, r: number): void {
  const t = look.trim;
  switch (look.face) {
    case "ram":
      both((s) =>
        part(
          head,
          "ring",
          t,
          [r * 0.45, r * 0.45, r * 0.45],
          [s * r * 0.8, r * 0.3, 0],
          [0, Math.PI / 2, s * 0.6],
        ),
      );
      return;
    case "dragon":
      part(
        head,
        "ball",
        look.coat,
        [r * 0.55, r * 0.4, r * 0.6],
        [0, -r * 0.2, r * 0.75],
      );
      both((s) =>
        part(
          head,
          "cone",
          t,
          [r * 0.12, r * 0.4, r * 0.12],
          [s * r * 0.45, r * 0.95, -r * 0.2],
          [-0.4, 0, s * -0.3],
        ),
      );
      return;
    case "dog":
      part(
        head,
        "ball",
        look.coat,
        [r * 0.45, r * 0.38, r * 0.55],
        [0, -r * 0.25, r * 0.8],
      );
      part(
        head,
        "ball",
        "#11131c",
        [r * 0.15, r * 0.12, r * 0.12],
        [0, -r * 0.1, r * 1.32],
      );
      both((s) =>
        part(
          head,
          "ball",
          t,
          [r * 0.2, r * 0.55, r * 0.35],
          [s * r * 0.95, -r * 0.1, 0],
          [0, 0, s * 0.25],
        ),
      );
      return;
    case "cat":
      both((s) =>
        part(
          head,
          "cone",
          look.coat,
          [r * 0.28, r * 0.5, r * 0.18],
          [s * r * 0.55, r * 0.95, 0],
          [0, 0, s * -0.3],
        ),
      );
      part(
        head,
        "ball",
        t,
        [r * 0.12, r * 0.09, r * 0.09],
        [0, -r * 0.1, r * 1.0],
      );
      both((s) =>
        part(
          head,
          "box",
          "#ffffff",
          [r * 0.9, r * 0.03, r * 0.03],
          [s * r * 0.55, -r * 0.2, r * 0.85],
          [0, 0, s * 0.15],
        ),
      );
      return;
    case "bull":
      both((s) =>
        part(
          head,
          "cone",
          t,
          [r * 0.15, r * 0.7, r * 0.15],
          [s * r * 1.05, r * 0.55, 0],
          [0, 0, s * -1.1],
        ),
      );
      part(
        head,
        "ball",
        "#c98a6b",
        [r * 0.6, r * 0.42, r * 0.5],
        [0, -r * 0.35, r * 0.75],
      );
      part(
        head,
        "ring",
        "#ffd166",
        [r * 0.2, r * 0.2, r * 0.2],
        [0, -r * 0.7, r * 1.1],
        [0, 0, Math.PI * 1.3],
      );
      return;
    case "bear":
      both((s) =>
        part(
          head,
          "ball",
          look.coat,
          [r * 0.3, r * 0.3, r * 0.18],
          [s * r * 0.7, r * 0.85, 0],
        ),
      );
      part(
        head,
        "ball",
        t,
        [r * 0.45, r * 0.35, r * 0.4],
        [0, -r * 0.3, r * 0.8],
      );
      part(
        head,
        "ball",
        "#11131c",
        [r * 0.15, r * 0.1, r * 0.1],
        [0, -r * 0.15, r * 1.18],
      );
      return;
    case "unicorn":
      part(
        head,
        "cone",
        t,
        [r * 0.14, r * 1.1, r * 0.14],
        [0, r * 1.25, r * 0.45],
        [0.5, 0, 0],
        true,
      );
      for (const [index, colour] of [
        "#ff8fd8",
        "#ffd166",
        "#5beac6",
        "#6aa8ff",
      ].entries())
        part(
          head,
          "ball",
          colour,
          [r * 0.22, r * 0.28, r * 0.22],
          [0, r * (0.8 - index * 0.35), -r * 0.85],
        );
      return;
    default:
      return;
  }
}
