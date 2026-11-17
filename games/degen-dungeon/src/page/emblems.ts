// The emblem stamped on each badge's medallion (`badges.ts`): a small picture in a 100 by 100 box, filled (with holes where a path
// crosses itself) or drawn as strokes, and the metal it is struck in. Every picture is an original, simple mark.
export interface Emblem {
  readonly d: string;
  readonly stroke?: boolean;
}
export type Metal = "gold" | "ice" | "iris" | "silver";

const ring = (x: number, y: number, r: number): string =>
  `M${String(x - r)} ${String(y)}a${String(r)} ${String(r)} 0 1 0 ${String(r * 2)} 0a${String(r)} ${String(r)} 0 1 0 ${String(-r * 2)} 0Z`;

export const emblems = {
  bowtie: { d: "M8 28 46 46v8L8 72Zm84 0L54 46v8l38 18ZM43 40h14v20H43Z" },
  box: {
    d: "M14 32 50 14l36 18v40L50 90 14 72Zm6 6v30l27 14V52Zm60 0L53 52v30l27-14Z",
  },
  butterfly: {
    d: "M47 30C30 6 4 14 9 38c3 15 21 17 37 11-15 9-24 27-12 35 9 6 15-6 15-20ZM53 30C70 6 96 14 91 38c-3 15-21 17-37 11 15 9 24 27 12 35-9 6-15-6-15-20ZM47 24h6v52h-6Z",
  },
  coin: { d: `${ring(50, 50, 40)}${ring(50, 50, 29)}M44 30h12v40H44Z` },
  diamond: { d: "M30 18h40l20 24-40 48-40-48Zm4 24 16 32 16-32Z" },
  hourglass: {
    d: "M24 10h52v8c0 16-18 24-18 32s18 16 18 32v8H24v-8c0-16 18-24 18-32s-18-16-18-32Z",
  },
  key: {
    d: `${ring(28, 46, 18)}${ring(28, 46, 8)}M44 41h46v10h-8v12h-8V51h-6v8h-8v-8H44Z`,
  },
  leaf: {
    d: "M16 84C16 40 46 12 88 12c0 44-28 72-72 72Zm6-6 40-40-3-3-40 40Z",
  },
  lightning: { d: "M58 6 22 54h24l-8 40 42-54H54Z" },
  mask: {
    d: "M50 10c26 0 36 20 32 42-4 22-18 38-32 38S22 74 18 52C14 30 24 10 50 10ZM28 42c5-8 14-8 17 1-6 5-12 5-17-1Zm44 0c-5-8-14-8-17 1 6 5 12 5 17-1ZM38 68c8 5 16 5 24 0-6 9-18 9-24 0Z",
  },
  moon: { d: "M62 8A42 42 0 1 0 92 64 34 34 0 1 1 62 8Z" },
  mountain: {
    d: "M4 88 38 28l14 22 12-14 32 52ZM36 8h4v24h-4Zm4 0 18 7-18 7Z",
  },
  people: {
    d: `${ring(32, 26, 13)}${ring(68, 26, 13)}M8 84c0-30 48-30 48 0Zm36 0c0-30 48-30 48 0Z`,
  },
  rocket: {
    d: `M50 4c17 12 21 36 17 60H33C29 40 33 16 50 4Z${ring(50, 30, 8)}M33 48 18 72l15-4Zm34 0 15 24-15-4ZM42 68h16l-4 20h-8Z`,
  },
  saucer: {
    d: "M8 58c0-12 84-12 84 0s-84 12-84 0Zm24-8c2-20 34-20 36 0ZM26 68l-6 16h6l6-16Zm22 2h4v16h-4Zm26-2 6 16h-6l-6-16Z",
  },
  shield: {
    d: "M50 6 86 18v28c0 24-16 40-36 48C30 86 14 70 14 46V18Zm-4 22v16H30v10h16v18h8V54h16V44H54V28Z",
  },
  snowflake: {
    d: "M50 6v88M12 28l76 44M12 72l76-44M40 14l10 10 10-10M40 86l10-10 10 10M10 40l14 2-4 13M90 60l-14-2 4-13M10 60l14-2-4-13M90 40l-14 2 4 13",
    stroke: true,
  },
  star: { d: "M50 6l12 31h33L68 57l10 33-28-19-28 19 10-33L5 37h33Z" },
  train: {
    d: `M24 12h52c6 0 10 4 10 10v50H14V22c0-6 4-10 10-10Zm0 10v20h22V22Zm30 0v20h22V22Z${ring(30, 82, 8)}${ring(70, 82, 8)}`,
  },
  wave: { d: "M4 58c14-22 30-22 42-4s28 18 50-8v48H4Z" },
} as const satisfies Readonly<Record<string, Emblem>>;
export type EmblemName = keyof typeof emblems;

// Each badge's emblem and metal; any badge not named here is a gold star.
const marks: Readonly<Record<string, readonly [EmblemName, Metal]>> = {
  "big-play": ["diamond", "gold"],
  "butterfly-effect": ["butterfly", "iris"],
  "caught-the-mania": ["lightning", "gold"],
  "cold-open": ["snowflake", "ice"],
  countdown: ["hourglass", "silver"],
  "crew-up": ["people", "gold"],
  "dead-locker": ["key", "silver"],
  "degen-dash": ["star", "gold"],
  "diamond-hands": ["diamond", "ice"],
  dream: ["moon", "silver"],
  "first-gig": ["box", "gold"],
  "first-trade": ["coin", "gold"],
  "full-crew": ["people", "iris"],
  "genesis-room": ["key", "gold"],
  "green-line": ["train", "silver"],
  grinder: ["coin", "silver"],
  hustle: ["box", "silver"],
  "intergalactic-otc": ["saucer", "iris"],
  lantern: ["moon", "gold"],
  liftoff: ["rocket", "gold"],
  "moon-party": ["moon", "iris"],
  "nine-masks": ["mask", "gold"],
  "pulled-the-plug": ["lightning", "silver"],
  "riding-the-pump": ["rocket", "silver"],
  "road-trip": ["mountain", "gold"],
  "rooftop-runner": ["mountain", "silver"],
  "saucer-pilot": ["saucer", "silver"],
  "saved-the-rest": ["shield", "gold"],
  "scam-spotted": ["shield", "silver"],
  based: ["shield", "iris"],
  "seed-paper": ["key", "gold"],
  "sha-beach": ["wave", "ice"],
  "shook-the-tuxes": ["bowtie", "silver"],
  "storm-funnel": ["snowflake", "silver"],
  "sub-zero": ["snowflake", "ice"],
  "the-watcher": ["saucer", "gold"],
  "thin-ice": ["snowflake", "ice"],
  "time-machine": ["hourglass", "iris"],
  "to-the-moon": ["rocket", "iris"],
  "touching-grass": ["leaf", "gold"],
};
export const markOf = (id: string): readonly [Emblem, Metal] => {
  const [name, metal] = marks[id] ?? ["star", "gold"];
  return [emblems[name], metal];
};
