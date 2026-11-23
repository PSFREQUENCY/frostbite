// How each body looks: the ten heroes in the order of the rules' `heroes`, then Bit, the tux, the beat cop, Max's Vests, and the town's
// crowd. Every look is an original design; the colours are a draft for the owner.
import { masks } from "./masks.ts";
import { stones } from "./statues.ts";

export type Face =
  | "bear"
  | "bull"
  | "cap"
  | "cat"
  | "dog"
  | "dragon"
  | "giant"
  | "miner"
  | "person"
  | "ram"
  | "robot"
  | "shades"
  | "unicorn"
  | "wizard";

export interface Look {
  // Clothes on the chest and arms, then fur or skin on the head and hands.
  readonly body: string;
  readonly bulk: number;
  readonly coat: string;
  readonly face: Face;
  // Hair, for the plain heads.
  readonly hair?: string;
  readonly headSize: number;
  readonly height: number;
  readonly legs: string;
  readonly tail?: string;
  // Horns, hats, ears and the like.
  readonly trim: string;
  // A statue's mask over the face (by the statue's number), for a hero playing as one.
  readonly mask?: number;
}

const look = (
  face: Face,
  height: number,
  [coat, body, legs, trim]: readonly [string, string, string, string],
  more: Partial<Look> = {},
): Look => ({
  body,
  bulk: 1,
  coat,
  face,
  headSize: 1,
  height,
  legs,
  trim,
  ...more,
});

export const heroLooks: readonly Look[] = [
  look("ram", 1.7, ["#29d3c3", "#1b6f8a", "#16384d", "#e9fffb"], {
    bulk: 1.05,
  }),
  look("dragon", 1.25, ["#7be36b", "#5fc456", "#4fb84a", "#ffd166"], {
    headSize: 1.25,
    tail: "#4fb84a",
  }),
  look("miner", 1.65, ["#c9c2ff", "#6b5fb8", "#3d3570", "#fff3b0"]),
  look("giant", 2.7, ["#9fd8ff", "#6fb6e8", "#4a86b8", "#e8f6ff"], {
    bulk: 1.4,
  }),
  look("wizard", 1.75, ["#8a5634", "#4a2f9c", "#3d2a8c", "#ffd166"]),
  look("dog", 1.55, ["#c98a4b", "#ff7a45", "#33415c", "#8a5a2b"], {
    tail: "#c98a4b",
  }),
  look("cat", 1.45, ["#ff9ecf", "#ffffff", "#ff9ecf", "#ff6fb5"], {
    tail: "#ff6fb5",
  }),
  look("bull", 1.9, ["#8b4a2b", "#2b2f45", "#1b1e2d", "#f2e3c6"], {
    bulk: 1.3,
  }),
  look("bear", 1.85, ["#6b4a32", "#3e7d5a", "#2f3b3a", "#c9a27a"], {
    bulk: 1.35,
  }),
  look("unicorn", 1.7, ["#f5f0ff", "#b48cff", "#f5f0ff", "#ffd166"], {
    tail: "#ff8fd8",
  }),
];
export const bitLook = look("robot", 1.4, [
  "#c7d2e0",
  "#8a9bb3",
  "#5a6b82",
  "#5beac6",
]);
export const tuxLook = look("shades", 1.85, [
  "#e8c9a8",
  "#0b0b10",
  "#0b0b10",
  "#ffffff",
]);
export const copLook = look("cap", 1.8, [
  "#c99a73",
  "#2a4b8d",
  "#1d2f57",
  "#ffd166",
]);
// The purse snatcher on the first morning: a grey hoodie, up.
export const thiefLook = look("cap", 1.75, [
  "#c99a73",
  "#5a5f6e",
  "#2a2f45",
  "#3a3f4a",
]);
export const vestLook = look("person", 1.8, [
  "#e0b08a",
  "#ff9a3c",
  "#3a3f4a",
  "#9aa3b2",
]);

// The people who wait at the island's places: Frost, Kiki the idol, Scruff in his trench coat, and the town's clerks and hustlers.
// Lux, the concert's headliner (an original singer): black hair (the two buns are `concert.ts`'s), a pink top and a black skirt; and her
// band.
export const luxLook = look(
  "person",
  1.66,
  ["#f1c9a5", "#ff6fb5", "#15151c", "#111111"],
  { hair: "#111111" },
);
// The Diamond Hands gang: turquoise suits, gold trim.
export const gangLook = look(
  "person",
  1.84,
  ["#8a5a3a", "#18c4b4", "#15151c", "#ffd166"],
  { hair: "#111111" },
);
export const bandLooks: readonly Look[] = [
  look("person", 1.8, ["#c99a73", "#2a2f45", "#15151c", "#2a1d14"], {
    hair: "#2a1d14",
  }),
  look("person", 1.76, ["#8a5a3a", "#5beac6", "#15151c", "#111111"], {
    hair: "#111111",
  }),
  look("person", 1.82, ["#e0b08a", "#ffd166", "#15151c", "#8a5a3a"], {
    hair: "#8a5a3a",
  }),
  look("person", 1.7, ["#5a3a2a", "#c9b6ff", "#15151c", "#111111"], {
    hair: "#111111",
  }),
];
const person = (body: string, hair: string, coat = "#e0b08a"): Look =>
  look("person", 1.75, [coat, body, "#2a2f45", "#ffd166"], { hair });
export const placeLooks: Readonly<Record<string, Look>> = {
  frost: person("#2a4b8d", "#f5fbff", "#bfe9ff"),
  "offer-kiki": person("#c9b6ff", "#ff6fb5", "#ffe0ec"),
  "offer-scruff": person("#6b5a3a", "#5a5a5a"),
  // The first morning's errands (`rules/errands.ts`): Pearl, shopping in ADOR, and Rosa, at its door.
  pearl: person("#7a4fa8", "#d8d8d8", "#8a5a3a"),
  rosa: person("#ff6f91", "#2a1d14", "#c99a73"),
  // The concert's people (`view/concert.ts`): the flyer crew in hi-vis, the gate's guards in yellow, the manager in black with a
  // headset, and Omi Omy's bartender in pink.
  flyers: person("#d8ff3a", "#2a1d14", "#8a5a3a"),
  "concert-gate": person("#ffd23a", "#111111", "#c99a73"),
  "stage-door": person("#1b1b22", "#5a3a2a", "#e0b08a"),
  "omi-omy": person("#ff6fb5", "#111111", "#f1c9a5"),
  // The food places (`view/food.ts`): the Crypto Shacks' waitresses in red, and Ms. Opal of Diamond Hands in turquoise.
  "shack-1": person("#e63946", "#2a1d14", "#c99a73"),
  "shack-2": person("#e63946", "#111111", "#f1c9a5"),
  "shack-3": person("#e63946", "#8a5a3a", "#e0b08a"),
  "diamond-hands": person("#18c4b4", "#111111", "#5a3a2a"),
  // Every loft's landlord (`rules/lofts.ts`): a cardigan the colour of old keys, grey hair.
  ...Object.fromEntries(
    Array.from({ length: 10 }, (_, hero) => [
      `landlord-${String(hero)}`,
      person("#8a6d3b", "#b8b8b8", "#d9b38c"),
    ]),
  ),
};
export const clerkLooks: readonly Look[] = [
  person("#3fae6b", "#3a2a20"),
  person("#e0b341", "#11131c", "#8a5a3a"),
  person("#ff5d5d", "#c98a4b", "#c99a73"),
  person("#6aa8ff", "#2a1d14", "#6b4a32"),
];

// The statues come to life: a hero who puts on a statue's mask plays as it, in its stone from head to foot, broad in the shoulder and
// tall, the mask over the face.
export const formLooks: readonly Look[] = stones.map((stone, index) =>
  look("person", 1.9, [stone, stone, stone, masks[index]?.detail ?? stone], {
    bulk: 1.15,
    headSize: 0.9,
    mask: index,
  }),
);
