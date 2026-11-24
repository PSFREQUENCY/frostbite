import { nightTick } from "./constants.ts";
import {
  branchOf,
  haus,
  hoverPad,
  liftAt,
  penthouseFloor,
  rideLift,
  topFloor,
} from "./haus.ts";
import { days, type Spot } from "./spot.ts";
import type { DayState, Draft, Point } from "./types.ts";

// The Fancy Lot, the showroom on Haus De Savage's plaza, lends its one futuristic hover car on the word of the Diamond Hands degens (Ms.
// Opal's crew at the seafront restaurant): from nightfall on the second day, for as long as the hero runs at least one of their jobs a
// day. A day with none and the lot takes the car back the next morning (`progress.ts`). Their three jobs a day, one after another, pay
// 10,000 DUN in all: a guest driven to Haus De Savage in the hover car, a sealed cold wallet to the vault guard on the Global DEX's
// steps, and an order run over the sea to Ms. Opal's yacht, which only a boat or the hover car can reach. The car waits on the lot's pad,
// and on the penthouse's own pad for a hero who owns it: the valet's lift raises it there from the plaza. The sky penthouse, sold by the
// concierge in the lobby, comes with the keycard that opens the top two floors, and the hero wakes up there. Names, prices and pay are a
// draft for the owner.
export const penthousePrice = 50_000;
export const crownPlate = 800;
export const jobPay = [3_000, 3_000, 4_000] as const;
const plaza = (east: number, south: number): Point => ({
  x: haus.x + east,
  z: haus.z + south,
});
export const hoverStand = plaza(-1_500, 500);
// Where the penthouse's owner wakes: up on the twentieth floor, beside the bed.
export const penthouseBed = {
  floor: penthouseFloor,
  x: haus.x + 300,
  z: haus.z - 500,
} as const;
export const valetBay = plaza(1_500, 500);
// Where a job is handed over, by number.
export const drops: readonly Point[] = [
  plaza(1_500, -600),
  { x: 14_900, z: 19_000 },
  { x: -2_500, z: 18_000 },
];
const jobsDone = (day: Pick<DayState, "done">): number =>
  day.done.filter((id) => id.startsWith("dh-job-")).length;
// Whether the hover car stays the hero's for tomorrow: today's deal, or a job run today.
export const keepsCar = (day: Pick<DayState, "done" | "hover">): boolean =>
  day.hover && (day.done.includes("hover-deal") || jobsDone(day) > 0);

type When = NonNullable<Spot["when"]>;
const holding: When = (day) => day.hover;
const keyed: When = (day) => day.keycard;
const floorSpot = (
  floor: number,
  id: string,
  label: string,
  node: string,
  at: Point,
): Spot => ({ ...at, floor, id, kind: "talk", label, node });
export const dealSites: readonly Spot[] = [
  {
    ...plaza(-1_500, -600),
    id: "fancy-lot",
    kind: "talk",
    label: "The Fancy Lot",
    node: "fancy-lot",
    on: days(2, 3, 4, 5, 6, 7),
    when: (day) => day.day > 2 || day.tick >= nightTick,
  },
  {
    ...hoverStand,
    id: "ride-hover",
    kind: "ride",
    label: "The hover car",
    rank: 0,
    ride: "hover",
    when: holding,
  },
  {
    ...valetBay,
    id: "haus-valet",
    kind: "talk",
    label: "The valet's lift",
    node: "haus-valet",
    when: (day) => day.hover && day.keycard,
  },
  {
    x: 14_100,
    z: 400,
    id: "dh-jobs",
    kind: "talk",
    label: "Rocco, a Diamond Hands degen",
    node: "dh-jobs",
    when: holding,
  },
  ...drops.map((at, index): Spot => ({
    ...at,
    id: `dh-drop-${String(index + 1)}`,
    kind: "talk",
    label: ["The doorman", "The vault guard", "Ms. Opal's yacht"][index] ?? "",
    node: `dh-drop-${String(index + 1)}`,
    when: (day) => day.dhJob === index + 1,
  })),
  floorSpot(0, "haus-concierge", "The concierge", "haus-concierge", {
    x: haus.x,
    z: haus.z - 100,
  }),
  ...Array.from({ length: topFloor + 1 }, (_, floor) =>
    floorSpot(
      floor,
      `haus-lift-${String(floor)}`,
      "The glass elevator",
      "haus-lift",
      liftAt,
    ),
  ),
  floorSpot(7, "haus-garden", "The sky garden", "do-garden", branchOf(7)),
  floorSpot(14, "haus-spa", "The sky spa", "do-spa", branchOf(14)),
  {
    ...floorSpot(penthouseFloor, "haus-home", "Your penthouse", "haus-home", {
      x: haus.x,
      z: haus.z - 500,
    }),
    when: keyed,
  },
  {
    ...hoverPad,
    floor: penthouseFloor,
    id: "haus-pad",
    kind: "ride",
    label: "Your hover car's pad",
    rank: 0,
    ride: "hover",
    when: (day) => day.hover && day.keycard,
  },
  floorSpot(topFloor, "haus-pool", "The rooftop pool", "do-swim", {
    x: haus.x + 1_000,
    z: haus.z - 500,
  }),
  floorSpot(topFloor, "haus-dine", "The Canopy", "haus-dine", {
    x: haus.x - 1_000,
    z: haus.z - 500,
  }),
  {
    x: haus.x,
    z: haus.z + 1_400,
    floor: topFloor,
    id: "haus-heli",
    kind: "ride",
    label: "The rooftop helicopter",
    rank: 0,
    ride: "heli",
  },
];

export const dealNodes: Readonly<
  Record<string, readonly { readonly does?: string; readonly to?: string }[]>
> = {
  "dh-drop-1": [{ does: "deal-deliver" }, {}],
  "dh-drop-2": [{ does: "deal-deliver" }, {}],
  "dh-drop-3": [{ does: "deal-deliver" }, {}],
  "dh-jobs": [{ does: "deal-job" }, {}],
  "fancy-lot": [{ does: "deal-take" }, { does: "deal-return" }, {}],
  "haus-concierge": [{ does: "deal-penthouse", to: "haus-concierge" }, {}],
  "haus-dine": [{ does: "deal-dine" }, {}],
  "haus-home": [{ does: "sleep" }, {}],
  "haus-lift": [
    { does: "deal-up", to: "haus-lift" },
    { does: "deal-down", to: "haus-lift" },
    { does: "deal-lobby", to: "haus-lift" },
    { does: "deal-roof", to: "haus-lift" },
    {},
  ],
  "haus-valet": [{ does: "deal-park" }, {}],
};

function deliver(day: Draft): string | null {
  const job = day.dhJob;
  if (job === 1 && day.ride !== "hover")
    return "Ms. Opal's guest rides in the hover car: bring it";
  const pay = jobPay[job - 1] ?? 0;
  day.pocket += pay;
  day.made += pay;
  day.done = [...day.done, `dh-job-${String(job)}`];
  day.dhJob = 0;
  return null;
}

export function dealDeed(day: Draft, name: string): string | null {
  switch (name) {
    case "deal-take":
      if (day.hover) return "the hover car is yours already";
      day.hover = true;
      day.done = [...day.done, "hover-deal"];
      return null;
    case "deal-return":
      if (!day.hover) return "you have no hover car to hand back";
      if (day.ride === "hover") return "step out of it first";
      day.hover = false;
      day.dhJob = 0;
      return null;
    case "deal-job":
      if (day.dhJob > 0) return "finish the job you have first";
      if (jobsDone(day) >= jobPay.length)
        return "that is every job for today: come back tomorrow";
      day.dhJob = jobsDone(day) + 1;
      return null;
    case "deal-deliver":
      return deliver(day);
    case "deal-penthouse":
      if (day.keycard) return "the penthouse is yours already";
      if (day.pocket < penthousePrice) return "not enough DUN";
      day.pocket -= penthousePrice;
      day.keycard = true;
      day.done = [...day.done, "penthouse"];
      return null;
    case "deal-up":
    case "deal-down":
      return rideLift(day, day.floor + (name === "deal-up" ? 1 : -1));
    case "deal-lobby":
      return rideLift(day, 0);
    case "deal-roof":
      return rideLift(day, topFloor);
    case "deal-park":
      if (day.ride !== "hover") return "drive the hover car onto the lift";
      day.ride = "foot";
      day.floor = penthouseFloor;
      day.x = hoverPad.x + 300;
      day.z = hoverPad.z;
      return null;
    case "deal-dine":
      if (day.pocket < crownPlate) return "not enough DUN";
      day.pocket -= crownPlate;
      day.ateAt = day.tick;
      day.done = [...day.done, "ate-crown"];
      return null;
    default:
      return "nothing to do";
  }
}
