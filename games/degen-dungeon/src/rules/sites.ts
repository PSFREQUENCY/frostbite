import { days, type Spot } from "./spot.ts";
import type { Point } from "./types.ts";
import { at, dockWater, helipad } from "./world.ts";

// The island's fixed places: the Faucet, gigs and their drops, offers and scams, loot, the fence and the freezer, tools, street words,
// talks (Frost, the Exchange floor, MAXX and the shops) and rides.
const offer = (
  where: Point,
  id: string,
  label: string,
  terms: {
    readonly cost: number;
    readonly crooked: boolean | null;
    readonly effect?: "drain" | "leak";
    readonly on?: number;
    readonly pay?: number;
  },
): Spot => ({
  ...where,
  id: `offer-${id}`,
  kind: "offer",
  label,
  pay: 0,
  ...terms,
});
const talk = (where: Point, node: string, label: string, on?: number): Spot =>
  on === undefined
    ? { ...where, id: node, kind: "talk", label, node }
    : { ...where, id: node, kind: "talk", label, node, on };
const gig = (
  where: Point,
  id: string,
  label: string,
  pay: number,
  to: string,
) => ({ ...where, id: `gig-${id}`, kind: "gig", label, pay, to }) as const;
const drop = (where: Point, id: string, label: string) =>
  ({ ...where, id: `drop-${id}`, kind: "drop", label }) as const;

export const sites: readonly Spot[] = [
  { ...at(4, -1_000, 0), id: "faucet", kind: "faucet", label: "The Faucet" },
  gig(at(4, 1_500, 0), "exchange", "Courier desk", 200, "drop-marina"),
  gig(at(3, 2_500, 0), "neon", "Arcade parts", 180, "drop-exchange"),
  gig(at(8, -4_000, 0), "street", "Dispatch", 220, "drop-shaft"),
  drop(at(1, 0, 4_000), "marina", "Yacht club door"),
  drop(at(4, -3_000, 0), "exchange", "Trading floor"),
  drop(at(7, 2_500, 0), "shaft", "Mine office"),
  offer(at(5, -4_500, 0), "kiki", "Kiki", {
    cost: 400,
    crooked: true,
    effect: "drain",
  }),
  offer(at(6, 2_500, 0), "scruff", "Scruff", {
    cost: 0,
    crooked: false,
    pay: 400,
  }),
  offer(at(4, -4_000, 0), "yield", "Yield stall", {
    cost: 300,
    crooked: null,
    pay: 300,
  }),
  offer(at(4, -5_500, 0), "double", "A famous face on a screen", {
    cost: 500,
    crooked: true,
    on: days(2, 5),
  }),
  offer(at(7, 4_500, 0), "recovery", "Recovery expert", {
    cost: 400,
    crooked: true,
    on: days(3, 4),
  }),
  offer(at(8, 4_500, 0), "job", "Recruiter", {
    cost: 0,
    crooked: true,
    effect: "drain",
    on: days(4),
  }),
  offer(at(0, 0, 4_500), "fed", "Agent at a booth", {
    cost: 1_000_000,
    crooked: true,
    on: days(3),
  }),
  offer(at(5, 0, 4_500), "slip", "Permission slip", {
    cost: 0,
    crooked: true,
    effect: "leak",
    on: days(2),
  }),
  offer(at(1, -4_500, 0), "meter", "Parking meter", {
    cost: 200,
    crooked: true,
    on: days(4),
  }),
  offer(at(6, 0, 4_500), "honeypot", "A coin everyone is buying", {
    cost: 600,
    crooked: true,
    on: days(5),
  }),
  {
    ...at(1, 2_500, 0),
    id: "loot-yacht",
    kind: "loot",
    label: "Unwatched yacht",
    value: 300,
  },
  {
    ...at(5, 0, -4_500),
    id: "loot-stall",
    kind: "loot",
    label: "Market stall",
    value: 240,
  },
  {
    ...at(4, 0, 3_000),
    id: "loot-vault",
    kind: "loot",
    label: "MAXX side door",
    value: 600,
  },
  { ...at(6, 0, -4_500), id: "fence", kind: "fence", label: "The fence" },
  {
    ...at(7, -4_500, 0),
    id: "freezer",
    kind: "freezer",
    label: "Hideout freezer",
  },
  {
    ...at(0, 2_500, 0),
    id: "tool-magnet",
    kind: "tool",
    label: "Landfill crane",
    tool: 1,
  },
  {
    ...at(8, 2_500, 0),
    id: "tool-vacuum",
    kind: "tool",
    label: "Car wash",
    tool: 2,
  },
  {
    ...at(4, 0, -4_500),
    id: "word-a",
    kind: "word",
    label: "A scrap of paper",
  },
  { ...at(4, 5_500, 0), id: "word-b", kind: "word", label: "A torn flyer" },
  { ...at(4, 0, 5_000), id: "word-c", kind: "word", label: "A takeout menu" },
  { ...at(4, 0, -5_500), id: "locker", kind: "locker", label: "A dead locker" },
  {
    ...at(6, -4_500, 0),
    hidden: true,
    id: "plug",
    kind: "plug",
    label: "A humming basement",
    on: days(2, 3, 4, 5),
  },
  {
    ...at(4, 4_500, 0),
    cost: 150,
    id: "rebrand",
    kind: "rebrand",
    label: "Rebrand booth",
  },
  talk(at(4, 0, 1_500), "frost", "Frost", days(1, 2, 3, 4)),
  talk(at(4, 0, -3_500), "chart", "The Exchange floor"),
  talk(at(4, 0, 4_000), "maxx", "MAXX window", days(2, 3, 4, 5)),
  talk(at(3, 4_500, 0), "fits", "Fit shop"),
  talk(at(8, 0, 4_500), "realtor", "Realtor", days(2, 3, 4, 5)),
  talk(at(3, 0, 4_500), "garage", "Garage", days(2, 3, 4, 5)),
  {
    ...at(8, 0, -4_500),
    id: "ride-scooter",
    kind: "ride",
    label: "Scooter stand",
    rank: 1,
    ride: "scooter",
  },
  {
    ...at(3, 0, -4_500),
    id: "ride-car",
    kind: "ride",
    label: "Car lot",
    rank: 2,
    ride: "car",
  },
  {
    x: dockWater.x,
    z: -100,
    id: "ride-boat",
    kind: "ride",
    label: "The dock",
    rank: 3,
    ride: "boat",
  },
  {
    ...helipad,
    id: "ride-heli",
    kind: "ride",
    label: "Helipad",
    rank: 4,
    ride: "heli",
  },
];
