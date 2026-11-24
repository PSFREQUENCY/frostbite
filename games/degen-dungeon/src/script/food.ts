// The words of the food places (`rules/food.ts`), in the order of the rules' answers. Each line is written once. A draft for the owner.
export const foodTalks: Readonly<
  Record<string, { readonly answers: readonly string[]; readonly say: string }>
> = {
  shack: {
    answers: [
      "A Satoshi Burger: 15 DUN",
      "Ask the waitress what is wrong",
      "Leave",
    ],
    say: "Crypto Shack: burgers, fries, a drive-through window and a neon bitcoin that never stops spinning. The waitress keeps glancing up the street.",
  },
  court: {
    answers: [
      "Noodles: 20 DUN",
      "Tacos: 20 DUN",
      "A smoothie: 10 DUN",
      "Leave",
    ],
    say: "The Floe Food Court: stalls under string lights, steam off the noodle pots, a taco truck with a line.",
  },
  dog: {
    answers: ["Pick her up"],
    say: "A small dog with a chewed lead is sniffing under the noodle stall. Her tag says BISCUIT.",
  },
  opal: {
    answers: ["The Diamond Plate: 500 DUN", "Leave"],
    say: "Diamond Hands. Ms. Opal, in turquoise from head to toe, looks you over. 'Everyone eats well here. Some people just pay more.'",
  },
  stream: {
    answers: ["Go live for a minute", "Not now"],
    say: "The streaming pod: a headset, a ring light, a chat already scrolling. It pays by the ten seconds while you are live.",
  },
  gang: {
    answers: ["Buy the diamond NFT: 5,000 DUN", "No, thanks"],
    say: "Two of the Diamond Hands gang fall in beside you, turquoise ties and diamond rings. 'Big day. A diamond NFT keeps a big day safe. Or else, who knows who hears about it.'",
  },
};
// Pip's word when the hero is starving, and when a stream has cut off for it.
export const hungryLine =
  "You are starving. Eat: a Crypto Shack, the Floe Food Court or Diamond Hands.";
