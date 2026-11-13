// The titles and lines of the short cinematic clips that start or finish a task, by what happened. Each line is written once. A draft
// for the owner.
export type ClipKind = "crane" | "orbit" | "push" | "sky" | "spin";
export const clipWords: Readonly<
  Record<string, readonly [kind: ClipKind, title: string, line: string]>
> = {
  bike: ["orbit", "ON TWO WHEELS", "Somebody left the lock open."],
  car: [
    "push",
    "JOYRIDE",
    "The window gives, the engine purrs, and a star of heat climbs on.",
  ],
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
