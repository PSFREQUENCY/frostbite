// How each body looks: the ten heroes in the order of the rules' `heroes`, then Bit, the tux, the beat cop, Max's Vests, and the town's
// crowd. Every look is an original design; the colours are a draft for the owner.
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
  look("wizard", 1.75, ["#e8c9a8", "#4a2f9c", "#3d2a8c", "#ffd166"]),
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
export const vestLook = look("person", 1.8, [
  "#e0b08a",
  "#ff9a3c",
  "#3a3f4a",
  "#9aa3b2",
]);

// The people who wait at the island's places: Frost, Kiki the idol, Scruff in his trench coat, and the town's clerks and hustlers.
const person = (body: string, hair: string, coat = "#e0b08a"): Look =>
  look("person", 1.75, [coat, body, "#2a2f45", "#ffd166"], { hair });
export const placeLooks: Readonly<Record<string, Look>> = {
  frost: person("#2a4b8d", "#f5fbff", "#bfe9ff"),
  "offer-kiki": person("#c9b6ff", "#ff6fb5", "#ffe0ec"),
  "offer-scruff": person("#6b5a3a", "#5a5a5a"),
};
export const clerkLooks: readonly Look[] = [
  person("#3fae6b", "#3a2a20"),
  person("#e0b341", "#11131c", "#8a5a3a"),
  person("#ff5d5d", "#c98a4b", "#c99a73"),
  person("#6aa8ff", "#2a1d14", "#6b4a32"),
];
