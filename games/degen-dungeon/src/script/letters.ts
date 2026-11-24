// S's twenty-one letters, in the order of the rules' letter spots, each pinned to the crew board under a theory. They disagree on
// purpose: the hand changes, and I becomes we. None quotes anyone real, and none says who S is. A draft for the owner.
export const theories = [
  "one person",
  "a group",
  "a machine",
  "someone from later",
] as const;

export const letters: readonly (readonly [text: string, theory: number])[] = [
  [
    "I laid the first block on a cold morning and sealed the day's paper inside it. Read it some time.",
    0,
  ],
  [
    "We did not build this for the screens in Ticker Square. We built it for the ones who cannot get a bank to answer.",
    1,
  ],
  [
    "If you are reading this, you crossed the riot. Good. Keep your keys where only you can find them.",
    0,
  ],
  [
    "The vault is not a treasure. It is a promise that nobody, not even me, gets to break.",
    0,
  ],
  [
    "We counted the coins before anyone wanted them. Counting is the whole trick.",
    1,
  ],
  [
    "Interest with no risk is a story. The island has heard it before and will hear it again.",
    2,
  ],
  [
    "Somebody ran the code the same week I did, and ran everywhere else too. The ice keeps his pace.",
    0,
  ],
  ["Winter is when the island finds out what it really owns.", 3],
  ["We left the door open on purpose. Leave it open behind you.", 1],
  ["Do not look for my face on the statue. Look at your own.", 2],
  ["A pizza is a pizza. Someone had to be first to pay for one.", 0],
  [
    "The robots will ask what we asked. Answer them better than we answered each other.",
    3,
  ],
  [
    "We split once, at a fork in the road, and both halves thought they were the parade.",
    1,
  ],
  [
    "I have seen how this ends. I am not allowed to say, but you will like the sunrise.",
    3,
  ],
  ["Your words are you. Anyone who asks for them is asking for you.", 2],
  [
    "The handwriting changes because the hand does. Do not read too much into it.",
    1,
  ],
  [
    "Nine first mornings, nine screens. We were watching to see who would help.",
    1,
  ],
  [
    "I have moved on to other things. That is all a founder should ever say.",
    0,
  ],
  ["The beach is on every billboard because everyone almost remembers it.", 3],
  [
    "We are not one person. We are not a crowd either. We are whoever keeps the rule.",
    1,
  ],
  ["Check everything. Even this letter. Especially this letter.", 2],
];
