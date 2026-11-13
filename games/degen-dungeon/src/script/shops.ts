// What the mom-and-pop shops say over the counter, by kind (the rules' `counters`, whose prices the first answer names), the lantern
// ground after dark, and the trip to the moon. Each line is written once. A draft for the owner.
export const shopTalks: Readonly<
  Record<string, { readonly answers: readonly string[]; readonly say: string }>
> = {
  lantern: {
    answers: [
      "Wish for clear sight",
      "Wish for respect",
      "Wish for a cold freezer",
      "Wish for a full pocket",
      "Not tonight",
    ],
    say: "The lantern ground. Thousands of paper lanterns drift up over the Old Floe, every one a message to the crypto gods. Write yours, then pick a wish.",
  },
  "shop-arcade": {
    answers: [
      "Claw machine, 10",
      "Hoop shot, 10",
      "Coin pusher, 10",
      "Dance machine, 10",
      "Leave",
    ],
    say: "Cabinets hum in the dark: a claw, a hoop shot, a coin pusher and a dance machine. Each wins on its own candles, one go a day.",
  },
  "shop-bait": {
    answers: ["A tin of lures, 10", "Leave"],
    say: "Worms, lures and harbour gossip. Buy something and the regulars warm to you.",
  },
  "shop-barber": {
    answers: ["A fresh fade, 60", "Leave"],
    say: "Take a seat. A new cut, and the street forgets your face for a while.",
  },
  "shop-bodega": {
    answers: ["An energy drink, 5", "Leave"],
    say: "Snacks, batteries, lottery scratchers, and a cat asleep on the counter.",
  },
  "shop-coffee": {
    answers: ["A cup to calm the nerves, 5", "Leave"],
    say: "Steam, beans, and a chalkboard that just says gm.",
  },
  "shop-gym": {
    answers: ["One session, 20", "Leave"],
    say: "Plates clank. Lift with the regulars and they remember you.",
  },
  "shop-hardware": {
    answers: ["A bundle of glow sticks, 30", "Leave"],
    say: "Tape, rope, torches, and glow sticks bright enough to read a tell by.",
  },
  "shop-laundry": {
    answers: ["Wash and change, 20", "Leave"],
    say: "Machines tumble. A change of clothes, and you look like somebody else.",
  },
  "shop-noodles": {
    answers: ["A bowl of noodles, 15", "Leave"],
    say: "Broth, steam, and a counter where people still talk to each other.",
  },
  "shop-pawn": {
    answers: ["Pawn what you carry", "Leave"],
    say: "The pawnbroker squints through a loupe: no questions, forty cents on the dollar.",
  },
  "shop-pizza": {
    answers: ["Two slices, 10", "Leave"],
    say: "Two slices, still hot. Somebody once paid a fortune in coins for a pair of these.",
  },
  colony: {
    answers: ["Say hello", "Leave"],
    say: "The airlock hisses. A colonist in a patched suit waves you in: they grow beans under the domes and mine nothing at all.",
  },
  crater: {
    answers: ["Take the rock", "Leave"],
    say: "The rim of an old crater. Earth hangs over it, blue and small, and a rock the size of a fist sits by your boot.",
  },
  "moon-pad": {
    answers: ["Fly home", "Stay a while"],
    say: "The shuttle home idles on the pad, dust settling round its feet.",
  },
  shuttle: {
    answers: ["Buy a seat, 500,000", "Not today"],
    say: "The night shuttle to the colony leaves from the top of Moon Tower. A seat is 500,000 DUN, helmet included.",
  },
};
