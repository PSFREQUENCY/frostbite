// The words of the first morning's errands (`rules/errands.ts`), in the order of the rules' answers. Each line is written once. A draft
// for the owner.
export const errandTalks: Readonly<
  Record<string, { readonly answers: readonly string[]; readonly say: string }>
> = {
  pearl: {
    answers: ["Give her the wallet", "Walk on"],
    say: "Pearl, at ADOR's perfume counter, pats every pocket of her coat for the third time: my wallet, my whole life is in it.",
  },
  rosa: {
    answers: ["Give her the purse back", "Walk on"],
    say: "Rosa, at ADOR's door: he took my purse! A grey hoodie, running east. Please!",
  },
  wallet: {
    answers: ["Pick it up", "Leave it"],
    say: "Where the crowd stood, a wallet in the gutter. The card inside reads: Pearl, ADOR Gold Member.",
  },
};
