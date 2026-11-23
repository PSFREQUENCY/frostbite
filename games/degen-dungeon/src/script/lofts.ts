// The words of each hero's landlord (`rules/lofts.ts`), in the order of the rules' answers. `{rent}` is today's rent and `{back}` the rent
// with the late fee. Each line is written once. A draft for the owner.
export const loftTalks: Readonly<
  Record<string, { readonly answers: readonly string[]; readonly say: string }>
> = {
  landlord: {
    answers: ["Pay the rent: {rent} DUN", "Not now"],
    say: "Your landlord, keys on a lanyard: rent is {rent} DUN today, due by nightfall. Miss it and your things sleep on the kerb.",
  },
  "landlord-out": {
    answers: ["Pay {back} DUN to get back in", "Not now"],
    say: "Your bed, your freezer and your boxes are out on the kerb, and the lock is new. Rent and the late fee, {back} DUN, and the door opens.",
  },
  // The hero's own business, an online shop run from the loft (`rules/business.ts`).
  till: {
    answers: ["Empty the till: {till} DUN", "Leave it selling"],
    say: "Your shop's laptop hums on the desk. Orders came in while you were out: {till} DUN is waiting in the till, and more every second.",
  },
  "landlord-up": {
    answers: [
      "A patio by the door: 500 DUN",
      "A balcony upstairs: 1,500 DUN",
      "The top floor, with the view: 5,000 DUN",
      "Not now",
    ],
    say: "Rent is paid, thanks. Moving up? One at a time: a patio first, then a balcony, then the top floor with a view of the whole city.",
  },
};
// Pip's word while the hero is locked out, and as nightfall nears with the rent unpaid.
export const lockedOutLine =
  "Your things are on the kerb by your loft. Pay the landlord to get back in.";
export const rentLine =
  "Rent is due by nightfall: pay the landlord at your loft's door.";
// The shop, the train and the board (`rules/business.ts`).
export const tillLine =
  "Short on rent? Your shop has sold enough: empty the till on the laptop in your loft.";
export const lineLine = (stop: string): string =>
  `Green Line Express, next stop: ${stop}.`;
export const skateLine = (left: number): string =>
  `Skate round the park! ${String(left)} more seconds on the board.`;
