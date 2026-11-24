// The words of Haus De Savage and the Fancy Lot (`rules/haus.ts`, `rules/deal.ts`): the dealer, Rocco of the Diamond Hands and where
// each of his jobs is handed over, the concierge, the glass elevator (`{floor}` is the floor it stands at), the penthouse, the valet's
// lift, the rooftop restaurant, and the sky garden, the sky spa and the pool. In the order of the rules' answers; each line is written
// once. A draft for the owner.
export const hausTalks: Readonly<
  Record<string, { readonly answers: readonly string[]; readonly say: string }>
> = {
  "dh-drop-1": {
    answers: ["Hand over the guest", "Not yet"],
    say: "The doorman of Haus De Savage opens the hover car's door for Ms. Opal's guest and bows them in.",
  },
  "dh-drop-2": {
    answers: ["Hand over the cold wallet", "Not yet"],
    say: "The vault guard on the Global DEX's steps signs for the sealed cold wallet without once looking at it.",
  },
  "dh-drop-3": {
    answers: ["Hand over the order", "Not yet"],
    say: "Ms. Opal's yacht rocks at anchor off the west shore. Her steward takes the order with both hands.",
  },
  "dh-jobs": {
    answers: ["Take the next job", "Walk away"],
    say: "Rocco, Diamond Hands, by the restaurant's door: three jobs a day, one at a time, paid in full. Run one every day and the hover car stays yours.",
  },
  "do-garden": {
    answers: ["Sit in the sky garden", "Leave"],
    say: "The sky garden on the seventh floor: ferns, a little fountain, and wind in the leaves thirty metres up.",
  },
  "do-spa": {
    answers: ["A spa session, 300", "Leave"],
    say: "The sky spa on the fourteenth floor: warm stones, cool towels and the city's noise a long way down.",
  },
  "do-swim": {
    answers: ["Swim a few lengths", "Leave"],
    say: "The rooftop pool, lit from below, its far edge spilling over into the sky.",
  },
  "fancy-lot": {
    answers: ["Take the hover car", "Hand the keys back", "Walk away"],
    say: "The Fancy Lot: one hover car on a turntable, and no price tag. The Diamond Hands vouch for you for as long as you run one of their jobs a day; miss a day and it glides back here by itself.",
  },
  "haus-concierge": {
    answers: ["Buy the sky penthouse: 50,000 DUN", "Walk away"],
    say: "Welcome to Haus De Savage. The glass elevators run to every floor. The sky penthouse on the twentieth comes with its own pad for a hover car and the keycard to the top two floors.",
  },
  "haus-dine": {
    answers: ["The Crown Plate: 800 DUN", "Not now"],
    say: "The Canopy, up on the roof: tables at the edge of the sky, and a plate with a crown of greens.",
  },
  "haus-home": {
    answers: ["Sleep", "Not yet"],
    say: "Your sky penthouse: glass on three sides, the whole city lit up below, and your own bed.",
  },
  "haus-lift": {
    answers: [
      "Up a floor",
      "Down a floor",
      "Ground floor lobby",
      "Rooftop pad (keycard)",
      "Step out",
    ],
    say: "The glass elevator, at {floor}. The city falls away under your feet as it climbs.",
  },
  "haus-valet": {
    answers: ["Lift the hover car to the penthouse", "Not now"],
    say: "The valet's lift: drive on, and the platform carries the hover car up the trunk to your penthouse's pad.",
  },
};

// Which floor the elevator stands at, as the words name it.
export const floorName = (floor: number): string =>
  floor === 0
    ? "the lobby"
    : floor === 20
      ? "the penthouse floor"
      : floor === 21
        ? "the rooftop"
        : `floor ${String(floor)}`;
// Pip's word while the elevator runs, on a Diamond Hands job, and the morning the Fancy Lot takes its car back.
export const liftLine = (to: number): string =>
  `Glass elevator, on its way to ${floorName(to)}.`;
const jobs = [
  "drive Ms. Opal's guest to Haus De Savage's doorman in the hover car.",
  "take the sealed cold wallet to the vault guard on the Global DEX's steps.",
  "run the order over the sea to Ms. Opal's yacht off the west shore.",
] as const;
export const jobLine = (job: number): string =>
  `Diamond Hands job ${String(job)}/3: ${jobs[job - 1] ?? ""}`;
export const repoLine =
  "The Fancy Lot took the hover car back: no Diamond Hands job yesterday. Make a new deal at the lot.";
// Where the hero is in the tower, and how its elevator works: by key, then by touch.
export const floorLines = (
  floor: number,
  inside: boolean,
): readonly [string, string] =>
  inside
    ? [
        `Haus De Savage, ${floorName(floor)}, in the glass elevator: R and F ride a floor at a time, E opens its panel.`,
        `Haus De Savage, ${floorName(floor)}, in the glass elevator: Climb and Drop ride a floor at a time, tap right for its panel.`,
      ]
    : [
        `Haus De Savage, ${floorName(floor)}. The glass elevator is on the south side of the trunk.`,
        `Haus De Savage, ${floorName(floor)}. The glass elevator is on the south side of the trunk.`,
      ];
