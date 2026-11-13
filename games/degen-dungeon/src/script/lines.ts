import { shopTalks } from "./shops.ts";

// What the talks say and the answers they offer, in the order of the rules' `nodes`, and the words for the day's goals. Each line is
// written once. A draft for the owner.
export const talks: Readonly<
  Record<string, { readonly answers: readonly string[]; readonly say: string }>
> = {
  chart: {
    answers: ["Buy 100 DUN worth", "Sell the bag", "Go all in", "Walk away"],
    say: "The Exchange floor. The coin is at {price} DUN.",
  },
  fits: {
    answers: [
      "Diamond-hand gloves, 300",
      "Laser-eye shades, 200",
      "Hooded parka, 400",
      "Walk away",
    ],
    say: "Floe and Co. fits: wear your rank.",
  },
  frost: {
    answers: ["Report a scam you spotted", "Ask about S", "Leave"],
    say: "Frost, on his bench in Ticker Square: seen anything I should know about?",
  },
  garage: {
    answers: ["Tune the engine, 500", "New paint, 200", "Walk away"],
    say: "The garage: wen car? Now leasing.",
  },
  hideout: {
    answers: [
      "Stash the pocket in the freezer",
      "Check the terminal",
      "Lie low a while",
      "Back up to the street",
    ],
    say: "The hideout: a freezer, a terminal, a board full of string, and nobody watching.",
  },
  home: {
    answers: ["Sleep", "Down to the hideout", "Not yet"],
    say: "Home: the bunk, the door, and the hatch down to the hideout.",
  },
  lying: {
    answers: ["Get up"],
    say: "You lie low. Upstairs, the heat goes looking for somebody else.",
  },
  maxx: {
    answers: ["Deposit the pocket", "Withdraw everything", "Walk away"],
    say: "The MAXX window. The sign says twenty percent a day.",
  },
  paper: {
    answers: [
      "In my pocket",
      "Under the mattress",
      "A photo on my phone",
      "In the freezer",
    ],
    say: "Pip, your new phone, says: write your seed words down. Where does the paper live?",
  },
  realtor: {
    answers: [
      "Studio apartment, 2,000",
      "Rowhouse, 6,000",
      "House with a yard, 20,000",
      "Walk away",
    ],
    say: "The realtor jingles a key ring: moving up?",
  },
  speech: {
    answers: ["Listen"],
    say: "Frost, thawed, on the steps of Ticker Square: first, keep your own keys.",
  },
  "speech-2": {
    answers: ["Keep listening"],
    say: "Second: check everything, twice, and then once more.",
  },
  "speech-3": {
    answers: ["Got it"],
    say: "Third: look after each other. That is the whole game.",
  },
  ...shopTalks,
};

// What Frost says about S, a different hint each day.
export const frostOnS: readonly string[] = [
  "S? Ask the letters, not me. They argue with each other.",
  "S laid the first block and left a newspaper in it. Then nothing.",
  "Some say S is a crowd. Some say a machine. I say read the handwriting.",
  "Nine screens, nine first mornings. Somebody was watching all of us.",
];

// The first morning's goals, in the order of the rules' `dayOneGoals`.
export const dayOneLines: Readonly<Record<string, string>> = {
  gig: "Take one honest gig and deliver it.",
  home: "Go home and sleep. Tomorrow the hustle starts.",
  paper: "Get your first DUN at the Faucet and write down your words.",
  riot: "Cross the FREE FROST riot in The Exchange.",
  speech: "Hear Frost's speech in Ticker Square.",
};

// After the Genesis Room: the oldest tunnel, and the beach at its end.
export const tunnelLine =
  "Run the oldest tunnel north to SHA Beach before the Vests catch up.";
export const gmLine = "Unknown number, two letters: gm.";
