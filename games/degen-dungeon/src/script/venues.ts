// What the landmarks say when you step up to their one thing to do, the bank's teller, and the moonshot launchpad. Each line is written
// once. A draft for the owner.
export const venueTalks: Readonly<
  Record<string, { readonly answers: readonly string[]; readonly say: string }>
> = {
  bank: {
    answers: ["Freeze 1,000 DUN", "Thaw 1,000 DUN", "Leave"],
    say: "A teller behind curved glass: she moves DUN between your pocket and your freezer, a thousand at a time.",
  },
  "do-dance": {
    answers: ["Dance, 20", "Leave"],
    say: "The floor lights up under your feet and the bass does the rest.",
  },
  "do-exhibits": {
    answers: ["See the exhibits, 5", "Leave"],
    say: "The first block under glass, a famous pizza in bronze, and a wall of wallets nobody can open.",
  },
  "do-film": {
    answers: ["Watch the late show, 15", "Leave"],
    say: "Tonight's film is about a city that forgot its keys. Popcorn is free with a ticket.",
  },
  "do-grass": {
    answers: ["Sit on the grass", "Leave"],
    say: "Real grass, real shade, and nobody talking about charts.",
  },
  "do-live": {
    answers: ["Go live", "Leave"],
    say: "A ring light, a camera and a chat that never sleeps. Your standing brings the viewers in.",
  },
  "do-print": {
    answers: ["Collect a print, 200", "Leave"],
    say: "Glowing frames on the curved walls, each piece signed by an artist nobody has met.",
  },
  "do-read": {
    answers: ["Read the whitepaper", "Leave"],
    say: "Nine pages on a lectern in the middle of the round room. People come here to read them slowly.",
  },
  "do-skate": {
    answers: ["Skate a run", "Leave"],
    say: "Drop in, carve the bowl, grind the rail. Fall down, get up, that is the whole sport.",
  },
  "do-track": {
    answers: ["Cut a track, 50", "Leave"],
    say: "The booth is warm, the mic is gold, and the producer says one take.",
  },
  "do-vr": {
    answers: ["Plug into a pod, 25", "Leave"],
    say: "The pod closes round you and the city comes back in wireframe, every hidden word lit up.",
  },
  launchpad: {
    answers: ["Stake 1,000", "Stake 5,000", "Stake 10,000", "Leave"],
    say: "The Moonshot Launchpad: put DUN on the next launch. Most go to nothing; about one in thirty goes a hundred times up.",
  },
};
