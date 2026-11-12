import {
  block,
  bodyRadius,
  island,
  lots,
  reach,
  sea,
  shore,
} from "./constants.ts";
import { heroes } from "./heroes.ts";
import type { Point, Ride } from "./types.ts";

// The island: nine boroughs in a grid, a street through the middle of each both ways, buildings in the corners, and the spots where
// something can be done. Every spot stands on a street, so anyone can walk to it. Adding a place to the game is adding a row here.
export const boroughs = [
  "Cold Harbor",
  "Whale Marina",
  "The Old Floe",
  "Neon Row",
  "The Exchange",
  "Meme Market",
  "Rug Row",
  "The Shaft",
  "Gig Street",
] as const;

interface Base extends Point {
  readonly id: string;
  readonly label: string;
}
export type Spot = Base &
  (
    | {
        // `crooked` null is decided by the day's seed; true and false are fixed by the story.
        readonly cost: number;
        readonly crooked: boolean | null;
        readonly kind: "offer";
        readonly pay: number;
      }
    | { readonly cost: number; readonly kind: "rebrand" }
    | { readonly hero: number; readonly kind: "home" | "recruit" }
    | { readonly kind: "drop" | "faucet" | "fence" | "freezer" | "word" }
    | { readonly kind: "gig"; readonly pay: number; readonly to: string }
    | { readonly kind: "loot"; readonly value: number }
    | { readonly kind: "ride"; readonly rank: number; readonly ride: Ride }
    | { readonly kind: "stop"; readonly next: string }
    | { readonly kind: "tool"; readonly tool: number }
  );

export const centreOf = (borough: number): Point => ({
  x: block / 2 + block * (borough % 3),
  z: block / 2 + block * Math.floor(borough / 3),
});
const at = (borough: number, east: number, south: number): Point => {
  const centre = centreOf(borough);
  return { x: centre.x + east, z: centre.z + south };
};

// The Green Line Express loops the eight outer boroughs, clockwise from Cold Harbor.
export const loop = [0, 1, 2, 5, 8, 7, 6, 3] as const;
// Where a boat floats beside the dock and where its rider steps ashore, and where the helicopter stands.
export const dockWater: Point = { x: 18_000, z: -400 };
export const dockLand: Point = { x: 18_000, z: 100 };
export const helipad: Point = at(4, 3_000, 0);

const homes: Spot[] = heroes.map((hero, id) => ({
  ...at(hero.borough, hero.hidden ? 2_500 : 0, hero.hidden ? 0 : -2_500),
  hero: id,
  id: `home-${String(id)}`,
  kind: "home",
  label: `${hero.name}'s place`,
}));
const recruits: Spot[] = heroes.flatMap((hero, id) =>
  hero.hidden
    ? []
    : [
        {
          ...at(hero.borough, hero.borough === 4 ? -2_000 : -2_500, 0),
          hero: id,
          id: `recruit-${String(id)}`,
          kind: "recruit" as const,
          label: hero.name,
        },
      ],
);
const stops: Spot[] = loop.map((borough, index) => ({
  ...at(borough, 0, 2_500),
  id: `stop-${String(borough)}`,
  kind: "stop",
  label: "Green Line Express",
  next: `stop-${String(loop[(index + 1) % loop.length] ?? 0)}`,
}));
const places: Spot[] = [
  { ...at(4, -1_000, 0), id: "faucet", kind: "faucet", label: "The Faucet" },
  {
    ...at(4, 1_500, 0),
    id: "gig-exchange",
    kind: "gig",
    label: "Courier desk",
    pay: 200,
    to: "drop-marina",
  },
  {
    ...at(3, 2_500, 0),
    id: "gig-neon",
    kind: "gig",
    label: "Arcade parts",
    pay: 180,
    to: "drop-exchange",
  },
  {
    ...at(8, -4_000, 0),
    id: "gig-street",
    kind: "gig",
    label: "Dispatch",
    pay: 220,
    to: "drop-shaft",
  },
  {
    ...at(1, 0, 4_000),
    id: "drop-marina",
    kind: "drop",
    label: "Yacht club door",
  },
  {
    ...at(4, -3_000, 0),
    id: "drop-exchange",
    kind: "drop",
    label: "Trading floor",
  },
  { ...at(7, 2_500, 0), id: "drop-shaft", kind: "drop", label: "Mine office" },
  {
    ...at(5, -4_500, 0),
    cost: 400,
    crooked: true,
    id: "offer-kiki",
    kind: "offer",
    label: "Kiki",
    pay: 0,
  },
  {
    ...at(6, 2_500, 0),
    cost: 0,
    crooked: false,
    id: "offer-scruff",
    kind: "offer",
    label: "Scruff",
    pay: 400,
  },
  {
    ...at(4, -4_000, 0),
    cost: 300,
    crooked: null,
    id: "offer-yield",
    kind: "offer",
    label: "Yield stall",
    pay: 300,
  },
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
  {
    ...at(4, 4_500, 0),
    cost: 150,
    id: "rebrand",
    kind: "rebrand",
    label: "Rebrand booth",
  },
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

export const spots: readonly Spot[] = [
  ...homes,
  ...recruits,
  ...stops,
  ...places,
];
const named = new Map(spots.map((spot) => [spot.id, spot]));
export const spotNamed = (id: string): Spot | undefined => named.get(id);

// The spot within reach of a place, the nearest if there are several.
export function nearest(x: number, z: number): Spot | null {
  let best: Spot | null = null;
  let gap = reach + 1;
  for (const spot of spots) {
    const away = Math.max(Math.abs(spot.x - x), Math.abs(spot.z - z));
    if (away < gap) {
      best = spot;
      gap = away;
    }
  }
  return best;
}

const inLot = (value: number): boolean => {
  const local = value % block;
  return lots.some(
    ([near, far]) => local > near - bodyRadius && local < far + bodyRadius,
  );
};
// Where feet and wheels may be: on the island and not in a building.
export const onLand = (x: number, z: number): boolean =>
  x >= bodyRadius &&
  z >= bodyRadius &&
  x <= island - bodyRadius &&
  z <= island - bodyRadius &&
  !(inLot(x) && inLot(z));
// Where a helicopter may be, and a boat (which also keeps off the shore).
export const inSky = (x: number, z: number): boolean =>
  x >= -sea && z >= -sea && x <= island + sea && z <= island + sea;
export const onWater = (x: number, z: number): boolean =>
  inSky(x, z) &&
  (x < -shore || z < -shore || x > island + shore || z > island + shore);
// The Swap Meet's lot in Meme Market, where the airdrop falls thickest.
export const inSwapMeet = (x: number, z: number): boolean =>
  x >= 31_000 && x <= 35_000 && z >= 17_000 && z <= 19_000;
