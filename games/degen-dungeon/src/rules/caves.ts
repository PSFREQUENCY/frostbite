import { bodyRadius } from "./constants.ts";
import { lofts } from "./rooms.ts";
import type { Spot } from "./spot.ts";
import type { DayState, Draft, Point } from "./types.ts";

// Underground, far off the island's map like the moon (`view/caves.ts`): the crystal caves, whose mouth opens in the island's south-east
// corner, wind east and down past quartz, diamond and amethyst to a back door of the Underground Bazaar; its main door is the stairs on
// The Shaft's street. Come in the back way without having come down the stairs today and the bazaar's guard turns you round and walks you
// up to the main door. Three honest traders: one buys the gems a miner digs (`powers.ts`), one sells crystal shards, one tells the phrase
// of the day. And the Light Re-emitter beside the Ice Runner in The Old Floe (the Time Machine's other half, `machine.ts`) sends the hero's
// light to any of five places. Names and prices are a draft for the owner.
interface Box {
  readonly x0: number;
  readonly x1: number;
  readonly z0: number;
  readonly z1: number;
}
const box = (x0: number, x1: number, z0: number, z1: number): Box => ({
  x0,
  x1,
  z0,
  z1,
});
// The way through: the entrance chamber, a tunnel, the crystal grotto, a passage, and the bazaar's hall.
export const caveWay: readonly Box[] = [
  box(120_000, 124_000, 4_000, 8_000),
  box(124_000, 130_000, 5_400, 6_600),
  box(130_000, 134_000, 2_000, 10_000),
  box(134_000, 136_000, 5_400, 6_600),
];
export const bazaar = box(136_000, 142_000, 2_000, 10_000);
// Inside a piece of the way, a body's width off its north and south walls (east and west, the pieces join).
const inside = ({ x0, x1, z0, z1 }: Box, x: number, z: number): boolean =>
  x >= x0 && x <= x1 && z >= z0 + bodyRadius && z <= z1 - bodyRadius;
// Whether a point is underground: in the caves or the bazaar.
export const underground = (x: number, z: number): boolean =>
  [...caveWay, bazaar].some((part) => inside(part, x, z));
export const inBazaar = (x: number, z: number): boolean =>
  x > bazaar.x0 && inside(bazaar, x, z);

const caveMouth: Point = { x: 34_800, z: 35_400 };
const caveIn: Point = { x: 121_800, z: 6_000 };
const stairs: Point = { x: 9_800, z: 30_300 };
const hallIn: Point = { x: 140_600, z: 6_000 };
export const gemPrice = 300;
export const shardPrice = 150;

const talk = (id: string, label: string, node: string, at: Point): Spot => ({
  id,
  kind: "talk",
  label,
  node,
  ...at,
});
export const caveSites: readonly Spot[] = [
  talk("cave-mouth", "A crystal cave", "cave-mouth", caveMouth),
  talk("cave-out", "Daylight, up the rocks", "cave-out", {
    x: 120_800,
    z: 6_000,
  }),
  talk("bazaar-stairs", "The Underground Bazaar", "bazaar-stairs", stairs),
  talk("bazaar-up", "The stairs up", "bazaar-up", { x: 141_400, z: 6_000 }),
  talk("trader-gems", "A gem trader", "trader-gems", { x: 137_800, z: 3_500 }),
  talk("trader-crystals", "A crystal seller", "trader-crystals", {
    x: 139_500,
    z: 8_500,
  }),
  talk("trader-words", "A teller of words", "trader-words", {
    x: 140_000,
    z: 3_500,
  }),
  talk("emitter", "The Light Re-emitter", "emitter", { x: 31_800, z: 6_000 }),
];

// Where the Light Re-emitter can send the hero: home, the DEX, the amphitheater, the caves and the bazaar's stairs.
export const beams = (hero: number): readonly Point[] => {
  const loft = lofts[hero];
  return [
    loft === undefined
      ? stairs
      : {
          x: loft.counter.x,
          z: loft.north ? loft.door.z0 - 200 : loft.door.z1 + 200,
        },
    { x: 13_600, z: 17_600 },
    { x: 33_600, z: 6_100 },
    { x: caveMouth.x - 600, z: caveMouth.z },
    { x: stairs.x - 600, z: stairs.z },
  ];
};

export const caveNodes: Readonly<
  Record<string, readonly { readonly does?: string; readonly to?: string }[]>
> = {
  "bazaar-guard": [{ does: "cave-kick" }, { does: "cave-kick" }],
  "bazaar-stairs": [{ does: "cave-stairs" }, {}],
  "bazaar-up": [{ does: "cave-up" }, {}],
  "cave-mouth": [{ does: "cave-in" }, {}],
  "cave-out": [{ does: "cave-out" }, {}],
  emitter: [
    ...[0, 1, 2, 3, 4].map((place) => ({ does: `cave-beam-${String(place)}` })),
    {},
  ],
  "trader-crystals": [{ does: "cave-shard" }, {}],
  "trader-gems": [{ does: "cave-gems" }, {}],
  "trader-words": [{}],
};

const go = (day: Draft, to: Point): null => {
  day.x = to.x;
  day.z = to.z;
  return null;
};
const gemsUnsold = (day: Pick<DayState, "done">): readonly string[] =>
  day.done.filter(
    (id) => id.startsWith("gem-") && !day.done.includes(`sold-${id}`),
  );

export function caveDeed(day: Draft, name: string): string | null {
  if (name.startsWith("cave-beam-")) {
    const to = beams(day.hero)[Number(name.slice(10))];
    if (to === undefined) return "nowhere to send your light";
    day.done = [...day.done, "beamed"];
    return go(day, to);
  }
  switch (name) {
    case "cave-in":
      day.done = [...day.done, "caves"];
      return go(day, caveIn);
    case "cave-out":
      return go(day, { x: caveMouth.x - 600, z: caveMouth.z });
    case "cave-stairs":
      day.done = [...day.done, "bazaar-main"];
      return go(day, hallIn);
    case "cave-up":
    case "cave-kick":
      if (name === "cave-kick") day.done = [...day.done, "kicked-out"];
      return go(day, { x: stairs.x - 600, z: stairs.z });
    case "cave-gems": {
      const gems = gemsUnsold(day);
      if (gems.length === 0) return "no gems to sell: a miner digs them up";
      day.pocket += gemPrice * gems.length;
      day.done = [...day.done, ...gems.map((id) => `sold-${id}`)];
      return null;
    }
    case "cave-shard":
      if (day.pocket < shardPrice) return "not enough DUN";
      day.pocket -= shardPrice;
      day.done = [...day.done, "crystal-shard"];
      return null;
    default:
      return "nothing to do";
  }
}

// Each tick: a hero who walks into the bazaar the back way, without having come down the stairs today, is stopped by its guard.
export function caveTick(day: Draft): void {
  if (
    inBazaar(day.x, day.z) &&
    day.talk === null &&
    !day.done.includes("bazaar-main") &&
    !day.done.includes("bazaar-back")
  ) {
    day.done = [...day.done, "bazaar-back"];
    day.talk = "bazaar-guard";
  }
}
