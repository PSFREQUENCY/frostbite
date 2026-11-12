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
  "echo-faucet":
    "Your newbie self is last in the Faucet line. Cut in and drain it first?",
  "echo-offer":
    "Your newbie self is about to test a recovery app. Warn them off it?",
  "echo-wake": "That is you on day one, broke and blinking. Hand over 500 DUN?",
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
  machine: "INTO THE TIME MACHINE",
  timeout: "THE DAY RAN OUT",
} as const;

// The first line of a day: the hero's wake-up, or on a trip back, the step out of the ice.
const tripWake =
  "You step out of the ice on day one, and somewhere in town a newbie you is waking up.";
export const wakeLine = (hero: number, loop: number): string =>
  loop > 0 ? tripWake : (wakeUps[hero] ?? "");

// What gives a newbie away before a tip: the seed decides which kind of newbie a trip back meets.
export const echoTells = {
  careful: "Your newbie self counts the same three coins twice.",
  reckless: "Your newbie self is already staring at a billboard.",
} as const;

// Where the newbie is, for the line that points the way.
export const echoPlaces: Readonly<Record<string, string>> = {
  "echo-faucet": "in the Faucet line at The Exchange",
  "echo-offer": "at the recovery app stand in Meme Market",
  "echo-wake": "waking up outside home",
};

export const machineLines = {
  asleep: "The Ice Runner sleeps in the ice. Reach the top and it will rise.",
  cooling: "The Time Machine is cooling down behind you.",
  risen:
    "The Ice Runner has risen in The Old Floe, and the Time Machine is open.",
} as const;

// How a trip back left the timeline, for the card after it.
export const timelineLine = (fate: number): string =>
  fate > 0
    ? `TIMELINE +${String(fate)} BRIGHTER`
    : fate < 0
      ? `TIMELINE ${String(fate)} DARKER`
      : "TIMELINE UNCHANGED";
