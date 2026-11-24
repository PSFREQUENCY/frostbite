import type { Errand } from "./errands.ts";
import type { DayState, Point, Ride, Wheels } from "./types.ts";

// What a place is. `on` is the days it is open (bit 1 is day one), `hidden` needs frost vision, and `only` is for one hero.
interface Base extends Point {
  readonly hidden?: boolean;
  readonly id: string;
  readonly label: string;
  readonly on?: number;
  readonly only?: number;
  // Only once the visitors have left the hero a saucer of their own (`invasion.ts`).
  readonly saucer?: boolean;
  // Only while a Degen Dash is run (`dash.ts`).
  readonly dash?: boolean;
  // One of the first morning's errands, there only while it is under way (`errands.ts`).
  readonly errand?: Errand;
  // On a floor of Haus De Savage (`haus.ts`), reached only there; and only while a test of the day holds (`deal.ts`).
  readonly floor?: number;
  readonly when?: (
    day: Pick<DayState, "day" | "dhJob" | "hover" | "keycard" | "tick">,
  ) => boolean;
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
    // A ride left on the street: anything with an engine has to be broken into, which brings heat; scooters and bikes are for anyone.
    | {
        readonly kind: "parked";
        readonly ride: Wheels;
      }
    | { readonly kind: "ride"; readonly rank: number; readonly ride: Ride }
    | { readonly kind: "stop"; readonly next: string }
    | { readonly kind: "talk"; readonly node: string }
    | { readonly kind: "tool"; readonly tool: number }
    // A masked statue on a borough's middle street (`statues.ts`).
    | { readonly kind: "statue"; readonly index: number }
  );

// Days as bits: `days(2, 3)` is open on days two and three.
export const days = (...list: readonly number[]): number =>
  list.reduce((bits, day) => bits | (1 << day), 0);
// Bit, the robot who starts asking questions on Launch Day, recruited like a hero but never played.
export const bit = 10;
