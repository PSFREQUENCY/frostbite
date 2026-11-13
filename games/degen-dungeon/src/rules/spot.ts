import type { Point, Ride } from "./types.ts";

// What a place is. `on` is the days it is open (bit 1 is day one), `hidden` needs frost vision, and `only` is for one hero.
interface Base extends Point {
  readonly hidden?: boolean;
  readonly id: string;
  readonly label: string;
  readonly on?: number;
  readonly only?: number;
}
export type Spot = Base &
  (
    | {
        // `crooked` null is decided by the day's seed. `effect` is what a scam does beyond its cost: a fast drain or a slow leak.
        readonly cost: number;
        readonly crooked: boolean | null;
        readonly effect?: "drain" | "leak";
        readonly kind: "offer";
        readonly pay: number;
      }
    | { readonly cost: number; readonly kind: "rebrand" }
    | { readonly hero: number; readonly kind: "home" | "recruit" }
    | {
        readonly kind:
          | "drop"
          | "faucet"
          | "fence"
          | "freezer"
          | "heroword"
          | "letter"
          | "locker"
          | "plug"
          | "word";
      }
    | { readonly kind: "gig"; readonly pay: number; readonly to: string }
    | { readonly kind: "loot"; readonly value: number }
    | { readonly kind: "ride"; readonly rank: number; readonly ride: Ride }
    | { readonly kind: "stop"; readonly next: string }
    | { readonly kind: "talk"; readonly node: string }
    | { readonly kind: "tool"; readonly tool: number }
  );

// Days as bits: `days(2, 3)` is open on days two and three.
export const days = (...list: readonly number[]): number =>
  list.reduce((bits, day) => bits | (1 << day), 0);
// Bit, the robot who starts asking questions on Launch Day, recruited like a hero but never played.
export const bit = 10;
