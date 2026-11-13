// Each hero's dream on the last day, with its two answers and the two endings they lead to, in the order of the rules' `dreams`, and the
// finale's lines. Every line is new and written once. A draft for the owner.
export interface Dream {
  readonly answers: readonly [string, string];
  readonly endings: readonly [string, string];
  readonly line: string;
}
export const dreams: readonly Dream[] = [
  {
    answers: ["Free first game for every newbie", "Charge for the first game"],
    endings: [
      "The sign never goes dark, and every newbie plays free.",
      "The sign never goes dark, and the till rings all night.",
    ],
    line: "The arcade and its generator are yours.",
  },
  {
    answers: ["Sit on the hoard", "Share the hoard"],
    endings: [
      "The biggest hoard on the island, and you on top of it.",
      "The hoard goes round the market, and it keeps growing.",
    ],
    line: "The biggest hoard on the island, piled where you can watch it grow.",
  },
  {
    answers: ["Start an honest mining co-op", "Take the peace and go"],
    endings: [
      "The co-op lamps light The Shaft, every shift paid fair.",
      "One lamp goes out, and it is a peaceful one.",
    ],
    line: "The twelve words open the old wallet at last.",
  },
  {
    answers: ["Open the park to everyone", "Keep the floe for yourself"],
    endings: [
      "The floe is the park where the whole island touches grass.",
      "The floe is yours alone, and very quiet.",
    ],
    line: "The last piece of the floe is back in your hands.",
  },
  {
    answers: ["Launch the fair coin", "Give the launch to the crowd"],
    endings: [
      "A rocket and a firework from Moon Tower, and not one promise.",
      "The crowd presses the button, and the crowd owns it.",
    ],
    line: "One fair coin with no insiders, ready on Moon Tower.",
  },
  {
    answers: [
      "Buy the house with the yard",
      "Keep renting and grow the courier crew",
    ],
    endings: [
      "A yard, a fence, and nobody's face on a billboard.",
      "The courier crew runs the whole of Gig Street.",
    ],
    line: "Your wages add up to a house with a yard.",
  },
  {
    answers: ["Sail off", "Stay in Nakasato"],
    endings: [
      "The renamed yacht slips past the fog line, nobody's kitty.",
      "The renamed yacht stays docked, and the marina is hers.",
    ],
    line: "The yacht is yours, won fair, and your tag is bought back.",
  },
  {
    answers: ["Keep the penthouse", "Give it to the people you stepped on"],
    endings: [
      "The penthouse lights come back on, and so does the bull.",
      "The penthouse becomes a home for the people you stepped on.",
    ],
    line: "You walk back into the penthouse.",
  },
  {
    answers: ["Buy the cabin and go", "Stay one more season"],
    endings: [
      "The cabin, the lake, and a number the crew can always call.",
      "One more season on the docks, paid in full this time.",
    ],
    line: "MAXX finally pays you in full.",
  },
  {
    answers: ["Hand the market to its regulars", "Keep running it"],
    endings: [
      "The Swap Meet belongs to its regulars now.",
      "The buckets stay full, and the line stays fair.",
    ],
    line: "The crowd is back, because the buckets never lied.",
  },
];

// Moon Night for everyone, after the dream.
export const finale = {
  genesis:
    "Find the last door under the party: it needs your crew's three words.",
  party: "Join the party under Moon Tower.",
} as const;
