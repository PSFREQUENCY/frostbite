import type { Handle, Shape } from "./props.ts";
import { tint } from "./venue-kits.ts";

// Inside ADOR, the department store (`rules/venues.ts`): a perfume counter (Pearl shops there on the first morning), racks of fashion,
// a table of phones, laptops and a 3D printer, the Omi Omy drinks bar at the back, mannequins by the door and a glowing column in the
// middle. Placed as `venue-kits.ts` places a landmark's things: `a` across the floor, `b` toward the doorway, metres.
type Put = (
  shape: Shape,
  at: readonly [number, number, number],
  size: readonly [number, number, number],
  colour: string,
  glow?: boolean,
  turn?: readonly [number, number, number],
) => Handle;

export function furnishAdor(put: Put, lit: (handle: Handle) => void): void {
  put("pill", [8, 2.4, 0.55], [4.2, 1.1, 1.1], "#f4f1ea");
  for (let k = 0; k < 5; k += 1)
    lit(
      put("ball", [6.6 + k * 0.7, 2.4, 1.25], [0.28, 0.4, 0.28], tint(k), true),
    );
  for (const [a, b] of [
    [-10, 3],
    [-10, -1],
    [-12, 1],
  ] as const) {
    put("post", [a, b, 1], [2.2, 0.12, 0.12], "#c7d2e0", false, [
      0,
      0,
      Math.PI / 2,
    ]);
    for (let k = 0; k < 5; k += 1)
      put("box", [a - 0.9 + k * 0.45, b, 0.8], [0.35, 0.9, 0.6], tint(k + a));
  }
  put("box", [-6, -11, 0.45], [5, 0.9, 1.6], "#2a2f45");
  for (let k = 0; k < 3; k += 1)
    lit(
      put("box", [-7.6 + k * 1.6, -11, 1.05], [0.9, 0.3, 0.6], "#9fd8ff", true),
    );
  put("pill", [7, -11, 0.6], [6, 1.2, 1.2], "#ff8fd8");
  for (let k = 0; k < 8; k += 1)
    lit(
      put("pill", [4.6 + k * 0.7, -11.6, 1.6], [0.2, 0.55, 0.2], tint(k), true),
    );
  for (const a of [-4, 4]) {
    put("post", [a, 11, 0.9], [0.3, 1.8, 0.3], "#f4f1ea");
    put("ball", [a, 11, 2], [0.45, 0.45, 0.45], "#f4f1ea");
  }
  lit(put("post", [0, -6, 2.5], [1.2, 5, 1.2], "#ff8fd8", true));
}
