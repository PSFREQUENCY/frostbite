// The words of the corner stores, the Gwei Gas stations and the ID kiosk (`rules/stores.ts`), in the order of the rules' answers. Each
// line is written once. A draft for the owner.
export const storeTalks: Readonly<
  Record<string, { readonly answers: readonly string[]; readonly say: string }>
> = {
  atm: {
    answers: [
      "Buy 100 DUN of the coin, fee 10",
      "Sell your bag, fee a tenth",
      "Walk away",
    ],
    say: "A coin ATM glows in the corner, the coin of the day ticking on its screen. KYC first: it wants your ID.",
  },
  freezer: {
    answers: ["An ice pop, 3", "A pint, 9", "Close the door"],
    say: "The freezer hums, its glass doors fogged over: ice pops, pints, and a bag of ice nobody ever buys.",
  },
  "freezer-ray": {
    answers: ["Take the freeze ray", "An ice pop, 3", "Close the door"],
    say: "Behind the ice pops, under an inch of frost: a gun of mirror and rainbow light, nitrogen swirling in its glass, frost circling it. A plate reads: FOR THE FACES OF THE CITY ONLY.",
  },
  id: {
    answers: ["Make my ID, 100", "Not now"],
    say: "The ID kiosk flashes: a photo, a thumbprint, a hologram. A Nakasato ID, good for every day after this one.",
  },
  "shop-bodega": {
    answers: ["Hot chips, 5", "A chopped cheese, 8", "A juice, 4", "Leave"],
    say: "Aisles of snacks, a wall of humming freezers, and the clerk behind an inch of bulletproof glass, spinning the tray round: what you need?",
  },
  "shop-gas": {
    answers: ["Snacks, 6", "A Fuzzy, 25 (ID)", "Fill the tank, 40", "Leave"],
    say: "Gwei Gas: fees in gwei on the sign outside, snacks at the window, and a clerk behind bulletproof glass who checks every ID twice.",
  },
};
