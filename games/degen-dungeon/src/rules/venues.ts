import { block, lots, visionTicks } from "./constants.ts";
import { cooled } from "./heat.ts";
import type { Box } from "./rooms.ts";
import type { Draft } from "./types.ts";

// The landmarks you can walk into, each on a lot of its own (corner 1 faces the street to its south, corner 2 the one to its north):
// a round hall in the middle of the lot behind a doorway from the street, or, for the skate park and the green, the whole lot open to the
// pavement. Inside are things to do (`activities`), each once a day, paid in DUN where it costs, and each good for something: calm,
// standing, frost vision, a cooler head, a little income. Every name is an original gag. A draft for the owner.
export type VenueKind =
  | "arcade"
  | "bank"
  | "cinema"
  | "club"
  | "dome"
  | "gallery"
  | "library"
  | "museum"
  | "park"
  | "records"
  | "skate"
  | "studio";
export interface Venue {
  // The hall's walkable floor (centimetres), or for an open venue the whole lot.
  readonly hall: Box;
  // The doorway from the street into the hall; an open venue has none.
  readonly door: Box | null;
  readonly id: string;
  readonly kind: VenueKind;
  readonly label: string;
  // The middle of the hall, and which way its doorway faces (1 south, -1 north).
  readonly middle: { readonly x: number; readonly z: number };
  readonly out: 1 | -1;
}

const table: readonly (readonly [number, 1 | 2, VenueKind, string])[] = [
  [0, 1, "library", "Whitepaper Library"],
  [1, 1, "studio", "Clipstream Studios"],
  [1, 2, "cinema", "Starlight Cinema"],
  [3, 1, "records", "Bassline Records"],
  [3, 2, "club", "The Mempool"],
  [4, 2, "bank", "First Block Bank"],
  [5, 1, "gallery", "Pixel Vault Gallery"],
  [5, 2, "skate", "Meme Market Skate Park"],
  [6, 1, "museum", "Museum of Genesis"],
  [6, 2, "club", "Club Halving"],
  [7, 1, "dome", "The Dome VR"],
  [7, 2, "arcade", "Mega Arcade"],
  [8, 1, "club", "Block Party"],
  [8, 2, "park", "Gig Street Green"],
];
// Half the width of a hall's square floor, which sits inside the round wall the city draws (radius 18.5 metres).
const half = 1_300;

export const venues: readonly Venue[] = table.map(
  ([borough, corner, kind, label]) => {
    const [west, east] = lots[corner % 2] ?? [0, 0];
    const [north, south] = lots[Math.floor(corner / 2)] ?? [0, 0];
    const left = block * (borough % 3);
    const top = block * Math.floor(borough / 3);
    const lot = {
      x0: left + west,
      x1: left + east,
      z0: top + north,
      z1: top + south,
    };
    const x = (lot.x0 + lot.x1) / 2;
    const z = (lot.z0 + lot.z1) / 2;
    const out = corner === 1 ? 1 : -1;
    const open = kind === "skate" || kind === "park";
    const hall = open
      ? lot
      : { x0: x - half, x1: x + half, z0: z - half, z1: z + half };
    const edge = out === 1 ? lot.z1 : lot.z0;
    const door = open
      ? null
      : {
          x0: x - 200,
          x1: x + 200,
          z0: out === 1 ? z + half - 50 : edge - 300,
          z1: out === 1 ? edge + 300 : z - half + 50,
        };
    return {
      door,
      hall,
      id: `venue-${String(borough)}-${String(corner)}`,
      kind,
      label,
      middle: { x, z },
      out,
    };
  },
);

const inside = (box: Box, x: number, z: number): boolean =>
  x >= box.x0 && x <= box.x1 && z >= box.z0 && z <= box.z1;
// Whether a point (centimetres) is on a landmark's floor or in its doorway.
export const inVenue = (x: number, z: number): boolean =>
  venues.some(
    ({ door, hall }) =>
      inside(hall, x, z) || (door !== null && inside(door, x, z)),
  );
// The landmark whose floor a point is on, if any.
export const venueAt = (x: number, z: number): Venue | null =>
  venues.find(({ hall }) => inside(hall, x, z)) ?? null;

// What there is to do at each kind of landmark: what it costs, how much FOMO it calms, standing it earns, frost vision it gives back
// (ticks), heat it cools, and DUN it pays. Each is once a day. The arcade hall uses the arcade's cabinets and the bank its teller.
export interface Activity {
  readonly calm: number;
  readonly cool: number;
  readonly cost: number;
  readonly pays: number;
  readonly rep: number;
  readonly vision: number;
}
const doing = (
  cost: number,
  calm: number,
  rep: number,
  vision = 0,
  cool = 0,
  pays = 0,
): Activity => ({ calm, cool, cost, pays, rep, vision });
export const activities: Readonly<Record<string, Activity>> = {
  dance: doing(20, 30, 4),
  exhibits: doing(5, 10, 8),
  film: doing(15, 40, 0, 0, 40),
  grass: doing(0, 25, 1),
  live: doing(0, 0, 2, 0, 0, 300),
  print: doing(200, 0, 12),
  read: doing(0, 5, 2, 120),
  skate: doing(0, 15, 6),
  track: doing(50, 0, 15),
  vr: doing(25, 20, 0, 300),
};
// Which activity (or the teller, or the cabinets) each kind of landmark has, by talk node.
export const nodeOf: Readonly<Record<VenueKind, string>> = {
  arcade: "shop-arcade",
  bank: "bank",
  cinema: "do-film",
  club: "do-dance",
  dome: "do-vr",
  gallery: "do-print",
  library: "do-read",
  museum: "do-exhibits",
  park: "do-grass",
  records: "do-track",
  skate: "do-skate",
  studio: "do-live",
};

// Doing an activity, once a day: it costs what it costs and does what it does (frost vision up to twice a day's worth).
export function venture(day: Draft, name: string): string | null {
  const activity = activities[name];
  if (activity === undefined) return null;
  const id = `did-${name}`;
  if (day.done.includes(id)) return "you have done that today";
  if (day.pocket < activity.cost) return "not enough DUN";
  day.pocket -= activity.cost;
  day.fomo = Math.max(0, day.fomo - activity.calm);
  day.rep += activity.rep;
  day.vision = Math.min(2 * visionTicks, day.vision + activity.vision);
  cooled(day, activity.cool);
  day.pocket += activity.pays;
  day.made += activity.pays;
  day.done = [...day.done, id];
  return null;
}

// The bank's teller moves a thousand DUN at a time between the pocket and the freezer (not on the morning the freezer looks empty).
export const bankStep = 1_000;
export function teller(day: Draft, into: boolean): string | null {
  if (day.fake) return "the teller cannot find your freezer this morning";
  if ((into ? day.pocket : day.freezer) < bankStep)
    return into ? "not enough DUN" : "not enough in the freezer";
  day.pocket += into ? -bankStep : bankStep;
  day.freezer += into ? bankStep : -bankStep;
  return null;
}
