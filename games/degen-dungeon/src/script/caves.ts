// The words of the crystal caves, the Underground Bazaar and the Light Re-emitter (`rules/caves.ts`), in the order of the rules'
// answers. Each line is written once. A draft for the owner.
export const caveTalks: Readonly<
  Record<string, { readonly answers: readonly string[]; readonly say: string }>
> = {
  "cave-mouth": {
    answers: ["Climb down inside", "Not now"],
    say: "A crack in the rocks breathes cold air, and deep inside something glitters: quartz, diamond, amethyst, all of it shining back at you.",
  },
  "cave-out": {
    answers: ["Climb back up to daylight", "Stay down here"],
    say: "A shaft of daylight falls on the rocks you came down.",
  },
  "bazaar-stairs": {
    answers: ["Go down the stairs", "Not now"],
    say: "Stairs under a lantern sign: THE UNDERGROUND BAZAAR. Music and spice drift up from below.",
  },
  "bazaar-up": {
    answers: ["Climb up to the street", "Stay"],
    say: "The main stairs, back up to The Shaft's street.",
  },
  "trader-gems": {
    answers: ["Sell your gems: 300 DUN each", "Just looking"],
    say: "A gem trader with a loupe in one eye: 'Dug something up? I pay fair for real stones. No fakes, no questions.'",
  },
  "trader-crystals": {
    answers: ["A crystal shard: 150 DUN", "Just looking"],
    say: "Crystal shards from the caves above, each one catching the lanterns. 'They keep the light you give them.'",
  },
  "trader-words": {
    answers: ["Thank you"],
    say: "An old teller of words leans in: 'Today's phrase: the keys you never share are the only keys you own.'",
  },
  emitter: {
    answers: [
      "Send your light home to your loft",
      "To the Global DEX",
      "To the Floe Amphitheater",
      "To the crystal caves",
      "To the Underground Bazaar's stairs",
      "Stay",
    ],
    say: "The Light Re-emitter hums beside the Ice Runner: step into its ring and your light scatters, to gather again wherever you send it.",
  },
  "bazaar-guard": {
    answers: ["Sorry, I will go round", "I am just looking"],
    say: "Heads turn all down the stalls. The guard steps in front of you: 'The back way? Through the caves? Main door is upstairs, friend. Let me walk you up.'",
  },
};
