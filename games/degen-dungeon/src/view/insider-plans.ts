import { venues, type Venue } from "../rules/venues.ts";
import { podium } from "./dex.ts";
import { hash } from "./hash.ts";
import { escalators, gallery } from "./mall.ts";

// Who is inside each landmark (`insiders.ts` draws them, with the Underground Bazaar's people from `bazaar.ts`), placed in metres in the city. What they do:
// walking a ring round a hall or up and down a line (an aisle, or an escalator that carries them up), standing at something, trading
// with their arms up round a trading post, sitting, dancing, or skating a ring on a board. Nobody here is anyone in particular.
export type Doing =
  "dance" | "ride" | "ring" | "line" | "sit" | "skate" | "stand" | "trade";
export interface Plan {
  readonly doing: Doing;
  // Where: the middle of a ring, the start of a line, or where they stand (metres), and the floor's height.
  readonly x: number;
  readonly y: number;
  readonly z: number;
  // A ring's radius, or a line's other end and how far it rises along the way.
  readonly r: number;
  readonly to: readonly [number, number];
  readonly rise: number;
  // Which way they face standing (radians: 0 toward +z), and how fast they go (metres a second; below zero the other way round).
  readonly face: number;
  readonly pace: number;
  readonly phase: number;
  readonly coat: string;
  readonly skin: string;
  readonly bag: boolean;
  // Which place they are in: a landmark's index in `venues`, or -1 for the bazaar.
  readonly place: number;
}

export const coats = [
  "#ff5d5d",
  "#5beac6",
  "#ffd166",
  "#6aa8ff",
  "#ff9ecf",
  "#c9c2ff",
  "#ff8a3c",
  "#3fae6b",
  "#f4f1ea",
  "#2a2f45",
] as const;
export const skins = [
  "#8d5524",
  "#c68642",
  "#f1c27d",
  "#e0ac69",
  "#5c3a21",
] as const;
// The DEX's floor jackets, and its guards' black.
const jackets = ["#2f6fb5", "#3fae6b", "#ffd166", "#2f6fb5", "#d64545"];

// A landmark's people, built in the hall's own frame (`a` across, `b` toward the doorway, as `venue-kits.ts` places things).
function inHall(venue: Venue, place: number): Plan[] {
  const [cx, cz] = [venue.middle.x / 100, venue.middle.z / 100];
  const out = venue.out;
  const floor = venue.kind === "bank" ? podium : 0;
  const plans: Plan[] = [];
  const add = (
    doing: Doing,
    a: number,
    b: number,
    more: Partial<Omit<Plan, "doing" | "place" | "x" | "z">> = {},
  ): void => {
    const index = plans.length;
    const pick = (list: readonly string[], salt: number): string =>
      list[Math.floor(hash(place, index, salt) * list.length)] ?? "#ffffff";
    plans.push({
      bag: false,
      coat: pick(coats, 1),
      face: 0,
      pace: 0,
      phase: hash(index, place, 7) * Math.PI * 2,
      r: 0,
      rise: 0,
      skin: pick(skins, 2),
      to: [0, 0],
      y: floor,
      ...more,
      doing,
      place,
      x: cx + a * out,
      z: cz + b * out,
    });
  };
  // Facing from (a, b) toward (ta, tb), in the city's terms.
  const toward = (a: number, b: number, ta: number, tb: number): number =>
    Math.atan2((ta - a) * out, (tb - b) * out);
  const ring = (
    count: number,
    radius: number,
    pace: number,
    more = {},
    doing: Doing = "ring",
  ) => {
    for (let k = 0; k < count; k += 1)
      add(doing, 0, 0, {
        pace: (k % 2 === 0 ? 1 : -1) * pace * (0.8 + hash(k, place, 3) * 0.5),
        phase: (k / count) * Math.PI * 2,
        r: radius + (k % 3) * 0.9,
        ...more,
      });
  };
  // Standing round a point, facing it (or away from it, looking out).
  const round = (
    count: number,
    a: number,
    b: number,
    radius: number,
    doing: Doing,
    outward = false,
    more = {},
    from = 0,
    to = Math.PI * 2,
  ) => {
    for (let k = 0; k < count; k += 1) {
      const angle = from + ((to - from) * (k + 0.5)) / count;
      const [pa, pb] = [
        a + Math.sin(angle) * radius,
        b + Math.cos(angle) * radius,
      ];
      const face = toward(pa, pb, a, b) + (outward ? Math.PI : 0);
      add(doing, pa, pb, { face, ...more });
    }
  };
  switch (venue.kind) {
    case "bank": {
      // The trading floor: traders packed round four posts, arms up; runners crossing the floor; guards at the doors and the vault; the
      // bell ringers up on the balcony.
      for (const [a, b] of [
        [-10, -3],
        [10, -3],
        [-8, 7],
        [8, 7],
      ] as const)
        for (let k = 0; k < 9; k += 1) {
          const angle = (k / 9) * Math.PI * 2;
          const [pa, pb] = [
            a + Math.sin(angle) * 2.6,
            b + Math.cos(angle) * 2.6,
          ];
          add("trade", pa, pb, {
            coat: jackets[(k + Math.round(a)) % jackets.length] ?? "#2f6fb5",
            face: toward(pa, pb, a, b),
          });
        }
      ring(8, 3.2, 1.2, { coat: "#f4f1ea" });
      ring(5, 15.2, 1.1);
      for (const [a, b, ta, tb] of [
        [-3.2, 13.6, -3.2, 20],
        [3.2, 13.6, 3.2, 20],
        [-6, -14, 0, 0],
        [6, -14, 0, 0],
      ] as const)
        add("stand", a, b, { coat: "#11131c", face: toward(a, b, ta, tb) });
      round(3, -12.6, -10, 0.8, "stand", false, { y: floor + 3.6 });
      break;
    }
    case "store": {
      // ADOR: shoppers on both floors, some with bags; browsers at the shop windows; people looking down from the balcony; riders on the
      // escalators.
      ring(24, 13.4, 1.1, { bag: true });
      round(8, 0, 0, 16.4, "stand", true, {}, 0.7, Math.PI * 2 - 0.7);
      ring(16, 13.6, 1, { y: gallery + 0.05 });
      round(
        5,
        0,
        0,
        12.5,
        "stand",
        false,
        { y: gallery + 0.05 },
        0.6,
        Math.PI * 2 - 0.6,
      );
      for (const { bottom, top } of escalators)
        for (let k = 0; k < 2; k += 1)
          add("ride", bottom[0], bottom[1], {
            pace: 0.45,
            phase: k * 0.5,
            rise: gallery,
            to: [cx + top[0] * out, cz + top[1] * out],
          });
      break;
    }
    case "club":
      for (let k = 0; k < 24; k += 1)
        add("dance", -4.2 + (k % 6) * 1.7, -4 + Math.floor(k / 6) * 2.1, {
          face: hash(k, place, 5) * Math.PI * 2,
        });
      add("stand", 0, -12.3, { face: toward(0, -12.3, 0, 0) });
      round(6, 0, 0, 14.3, "sit", false, {}, 1.2, Math.PI * 2 - 1.2);
      break;
    case "cinema":
      for (let k = 0; k < 45; k += 1)
        if (hash(k, place, 9) < 0.6)
          add("sit", (Math.floor(k / 5) - 4) * 1.4, -6 + (k % 5) * 2.4 + 0.15, {
            face: toward(0, 0, 0, -10),
          });
      break;
    case "library":
      round(4, 0, 0, 7.2, "sit");
      round(6, 0, 0, 13.4, "stand", true, {}, 0.9, Math.PI * 2 - 0.9);
      ring(3, 10.2, 0.9);
      break;
    case "studio":
      add("stand", -5, -4.6, { face: toward(-5, -4.6, -5, -6) });
      add("stand", 5, -4.6, { face: toward(5, -4.6, 5, -6) });
      for (const a of [-1.2, 1.2])
        add("stand", a, 3.4, { face: toward(a, 3.4, 0, -10) });
      round(8, 0, -10, 9.5, "sit", false, {}, -0.9, 0.9);
      break;
    case "records":
      round(8, 0, -2, 3.2, "dance");
      add("stand", -1, -12.6, { face: toward(-1, -12.6, 0, 0) });
      add("stand", 1, -12.6, { face: toward(1, -12.6, 0, 0) });
      ring(2, 11, 1);
      break;
    case "gallery":
      round(10, 0, 0, 15.6, "stand", true, {}, 0.7, Math.PI * 2 - 0.7);
      ring(4, 11.2, 0.8);
      break;
    case "museum":
      round(8, 0, 0, 7.2, "stand", true);
      ring(4, 13, 0.8);
      break;
    case "dome":
      round(8, 0, 0, 10.1, "stand", true, { coat: "#5beac6" });
      ring(4, 5.6, 0.9);
      break;
    case "arcade":
      for (let k = 0; k < 21; k += 1)
        if (hash(k, place, 4) < 0.7) {
          const [col, row] = [(k % 7) - 3, Math.floor(k / 7) - 1];
          add("stand", col * 2.6, row * 5 + 1.25, {
            face: toward(0, 1, 0, 0),
          });
        }
      for (const b of [-2.5, 2.5]) {
        add("line", -9, b, { pace: 1.1, to: [cx + 9 * out, cz + b * out] });
        add("line", 9, b, { pace: 0.9, to: [cx - 9 * out, cz + b * out] });
      }
      break;
    case "skate":
      ring(6, 8.4, 4.2, {}, "skate");
      round(6, 0, 0, 15.2, "stand", false, {}, 0.5, Math.PI * 2 - 0.5);
      break;
    case "park":
      for (const [a, b] of [
        [-8, -6],
        [9, 8],
        [-5, 10],
      ] as const)
        round(4, a, b, 1.1, "sit");
      ring(8, 16.4, 1);
      round(3, 6, -9, 0.9, "stand");
      break;
  }
  return plans;
}

export const hallPlans: readonly Plan[] = venues.flatMap((venue, place) =>
  inHall(venue, place),
);
