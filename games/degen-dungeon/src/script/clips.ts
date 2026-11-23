// The titles and lines of the short cinematic clips that start or finish a task, by what happened. Each line is written once. A draft
// for the owner.
export type ClipKind = "crane" | "orbit" | "push" | "sky" | "spin";
export const clipWords: Readonly<
  Record<string, readonly [kind: ClipKind, title: string, line: string]>
> = {
  abducted: [
    "sky",
    "TAKEN UP",
    "Lights, a hum, the moon going by... and then your own ceiling.",
  ],
  bike: ["orbit", "ON TWO WHEELS", "Somebody left the lock open."],
  car: [
    "push",
    "JOYRIDE",
    "The window gives, the engine purrs, and a star of heat climbs on.",
  ],
  contact: [
    "orbit",
    "FIRST CONTACT",
    "Glow sticks for them, pizza for everyone. The saucers wink and head home.",
  ],
  moto: [
    "push",
    "ON THE PEGS",
    "Kick the stand up and lean into the first bend.",
  ],
  saucers: [
    "sky",
    "THEY ARE HERE",
    "Saucers over Nakasato, beams down. Somebody up there wants a word.",
  ],
  semi: [
    "crane",
    "BIG RIG",
    "You climb up into the cab and the whole street looks smaller.",
  ],
  statue: [
    "spin",
    "MASK ON",
    "The stone steps down off its plinth, and now it moves when you move.",
  ],
  traded: [
    "orbit",
    "INTERGALACTIC OTC",
    "They pay over the odds for your meme coins and fly off delighted.",
  ],
  truck: ["push", "PICKUP", "High cab, heavy door, and a bed full of nothing."],
  // The first morning's errands (`rules/errands.ts`).
  "wallet-returned": [
    "orbit",
    "GOOD AS GOLD",
    "Pearl hugs her wallet, then you, and presses 200 DUN into your hand.",
  ],
  snatch: [
    "push",
    "STOP, THIEF!",
    "A grey hoodie snatches Rosa's purse at ADOR's door and bolts east. She looks straight at you.",
  ],
  "purse-caught": [
    "orbit",
    "GOT HIM",
    "A hand on his hood, the purse hits the pavement, and he runs off without it.",
  ],
  "purse-returned": [
    "orbit",
    "HERO OF THE MORNING",
    "Rosa holds her purse to her heart. The whole street saw what you did.",
  ],
  van: ["push", "MINIVAN", "Seats for the whole crew and a cup holder each."],
  colony: [
    "orbit",
    "THE COLONY",
    "Beans under the domes, and a colonist who is glad of company.",
  ],
  "did-dance": [
    "spin",
    "ON THE FLOOR",
    "The lights find you and the bass does the rest.",
  ],
  "did-exhibits": [
    "orbit",
    "THE FIRST BLOCK",
    "Under glass, the thing that started all of it.",
  ],
  "did-film": [
    "crane",
    "THE LATE SHOW",
    "The lights go down. For two hours, nobody checks a chart.",
  ],
  "did-grass": ["crane", "TOUCHING GRASS", "Shoes off. Sky up. Breathe."],
  "did-live": ["orbit", "ON AIR", "The chat explodes. The tips roll in."],
  "did-print": [
    "push",
    "COLLECTED",
    "It glows a little brighter now that it is yours.",
  ],
  "did-read": [
    "push",
    "THE WHITEPAPER",
    "Nine pages. You read them slowly, like everybody should.",
  ],
  "did-skate": ["spin", "DROP IN", "Carve, grind, fall, laugh, again."],
  "did-track": ["push", "ONE TAKE", "The producer nods. That was the one."],
  "did-vr": [
    "spin",
    "PLUGGED IN",
    "The city in wireframe, every hidden word alight.",
  ],
  enter: ["crane", "", "Step inside."],
  fit: ["orbit", "FRESH FIT", "New threads, new you, same keys."],
  game: ["push", "INSERT COIN", "The cabinet lights up and the music starts."],
  lantern: [
    "sky",
    "MESSAGE TO THE GODS",
    "Your words rise with thousands of others.",
  ],
  letter: [
    "push",
    "A LETTER FROM S",
    "Folded small, and meant for whoever finds it.",
  ],
  moon: ["sky", "TO THE COLONY", "Strap in. The helmet is yours."],
  "moon-rock": [
    "orbit",
    "A ROCK FROM THE MOON",
    "Heavier than it looks, and older than everything.",
  ],
  moonshot: [
    "sky",
    "MOONSHOT",
    "A hundred times up. The launchpad crowd goes wild.",
  ],
  rugged: ["push", "RUGGED", "The launch went up without your stake."],
  scooter: ["orbit", "ON TWO WHEELS", "Kick off and the street is yours."],
  task: ["orbit", "", "Done."],
};
