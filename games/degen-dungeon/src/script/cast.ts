// The words about the cast and the people they meet, each written once. They are a draft for the owner: every line here is new, and none
// is a real person's. A hero's wake-up is in the order of the rules' `heroes`.
export const wakeUps: readonly string[] = [
  "A shutoff notice says the arcade sign goes dark at midnight.",
  "You hatch on an auction block, sold as a rare egg.",
  "Drilling overhead relights your lamp, and a text says your old wallet is worth a fortune.",
  "You thaw out under a for-sale sign on your own home.",
  "A cell door opens, and your followers want refunds.",
  "You are late for your first shift, and your face is on a coin you own none of.",
  "Your ninth owner tosses you off his yacht at dawn.",
  "You were liquidated overnight, and the movers are already here.",
  "A text says withdrawals are paused, on the day you were finally right.",
  "A line of strangers runs around the block, and every one of them wants to trade.",
];

// What each offer says while it waits for a yes or a no, by the spot's name.
export const offers: Readonly<Record<string, string>> = {
  "offer-kiki":
    "Bestie, I lost my seed phrase! Will you test my recovery app with yours?",
  "offer-scruff":
    "Psst. Help me find three lost words, and never tell me yours.",
  "offer-yield": "Interest every single day and no risk at all, friend.",
};

export const recruitLine = (name: string): string =>
  `${name} could use a crew. Team up?`;

// How a day ended, for the card after it.
export const endings = {
  closed: "YOU CALLED IT A DAY",
  frozen: "FROZEN BY THE TUXES",
  home: "HOME SAFE",
  timeout: "THE DAY RAN OUT",
} as const;
