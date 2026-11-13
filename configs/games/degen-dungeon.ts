import { defineGame } from "@frostbite/shared/games";

import { targetChains } from "../chains.ts";

const [betaTarget] = targetChains;
if (betaTarget === undefined) throw new Error("No target chain is configured.");

const once = (
  id: string,
  title: string,
  criteria: string,
  description: string,
) =>
  ({
    claimPolicy: "once",
    criteria,
    description,
    id,
    title,
    verification: "replay-verified",
  }) as const;

// Degen Dungeon: one open island city, Nakasato, where a broke newbie wakes up to a mess and climbs over five story days by honest gigs, a
// crew, the market and staying ahead of the tuxes, to Moon Night, SHA Beach and the Time Machine. A run is one day of one hero. Walk-in
// shops, parked rides, the lantern night and the moon colony fill the city between the story's beats. The title, the words and every
// milestone are a draft for the owner; a milestone's id is one the game's rules decide (`games/degen-dungeon/src/rules/milestones.ts`).
export const degenDungeonGame = defineGame({
  capabilities: ["milestone:claim", "run:submit"],
  description:
    "Wake up broke in Nakasato, an island city of nine boroughs, and climb from Newbie to Whale over five story days: the FREE FROST riot morning, the mania, the winter and its Great Airdrop, Launch Day, and Moon Night. Pick one of ten heroes, each with their own story. Hear Frost's speech, write down your seed words and choose where the paper lives, hustle honest gigs, crew up, trade the coin of the day, and spot the scams before they drain you. Walk, run, duck and crawl through living streets: step into the corner shops, borrow a parked car, scooter or bike, and walk into the landmarks: dance in three clubs, catch the late show, plug into the VR dome, skate the park, play the arcade, read in the library, and bank your DUN. Steal if you must, but every star of heat brings someone: a beat cop, then the tuxes. Frost vision shows hidden words, the watcher's footprints and the tells of a scam. S's letters lie among the flyers, and on Moon Night your crew's three words open the Genesis Room and the oldest tunnel to SHA Beach. After dark, send a lantern up to the crypto gods; they may answer in the morning. Stake DUN on a moonshot: most go to nothing, a lucky one goes a hundred times up and buys a seat to the moon colony. Reach the top and the Ice Runner statue rises: step into its Time Machine, go back to day one, and meet your newbie self, where every answer bends the timeline. DUN is in-game credit only. Every milestone is checked by replaying your day.",
  id: "degen-dungeon",
  launch: { mode: "embedded" },
  milestones: [
    once(
      "faucet",
      "First DUN",
      "Take your first DUN from the Faucet.",
      "The Faucet gives every newbie a first handful of DUN.",
    ),
    once(
      "first-gig",
      "Honest work",
      "Finish one delivery.",
      "A parcel carried to its door and paid for.",
    ),
    once(
      "grinder",
      "Grinder",
      "Finish three deliveries in one day.",
      "Three honest gigs before the day is out.",
    ),
    once(
      "first-crew",
      "Crewed up",
      "Recruit one crewmate.",
      "Somebody said yes to running with you.",
    ),
    once(
      "full-crew",
      "It takes three",
      "Recruit a second crewmate.",
      "A full crew of three.",
    ),
    once(
      "scam-spotted",
      "Not today",
      "Walk away from a crooked offer.",
      "You saw the scam for what it was and walked.",
    ),
    once(
      "full-loop",
      "Round the loop",
      "Ride the Green Line Express eight times in one day.",
      "Every stop on the loop, back to where you got on.",
    ),
    once(
      "fenced",
      "Sticky fingers",
      "Sell stolen goods to the fence.",
      "What you took is DUN now.",
    ),
    once(
      "shook-the-tuxes",
      "Shook the tuxes",
      "Get from three stars of heat to none without being frozen.",
      "They were always closer than they were, until they were gone.",
    ),
    once(
      "cold-storage",
      "Cold storage",
      "Hold 500 DUN in the hideout freezer.",
      "What is in the freezer stays yours.",
    ),
    once(
      "home-safe",
      "Home safe",
      "End a day at your own door.",
      "You made it home.",
    ),
    once(
      "storm-catch",
      "Storm chaser",
      "Catch 5,000 DUN in the Great Airdrop.",
      "The sky opened and you held out your hands.",
    ),
    once(
      "storm-funnel",
      "The funnel",
      "Catch 100,000 DUN in the Great Airdrop.",
      "A magnet, a vacuum and the right place to stand.",
    ),
    once(
      "three-words",
      "Three words",
      "Find three seed words in one day.",
      "Three scraps of paper, each with one word.",
    ),
    once(
      "payday",
      "Payday",
      "Make 1,000 DUN in one day from gigs, honest offers and the fence.",
      "A thousand DUN made in one day.",
    ),
    once(
      "time-machine",
      "The Ice Runner rises",
      "Reach the top, and step into the Time Machine.",
      "A statue in The Old Floe wakes for a hero worth 100,000 DUN.",
    ),
    once(
      "met-yourself",
      "Is that me?",
      "Meet your newbie self on a trip back to day one.",
      "Take the Time Machine, then look outside your old home.",
    ),
    once(
      "brighter-timeline",
      "A brighter timeline",
      "Answer your newbie self three times and leave the past better than you found it.",
      "The kind answer is not always the one that helps.",
    ),
    once(
      "the-speech",
      "Three things",
      "Hear Frost's speech in Ticker Square on the first morning.",
      "Cross the riot. Frost is thawed and talking.",
    ),
    once(
      "seed-paper",
      "Write it down",
      "Write down your seed words and choose where the paper lives.",
      "The Faucet comes with a phone and a pen.",
    ),
    once(
      "your-word",
      "Your own word",
      "Find your hero's own word by frost vision on the first morning.",
      "Look near your door with frost vision on.",
    ),
    once(
      "hustle",
      "The hustle",
      "Finish your hero's story for day two.",
      "Pip's line says where the story goes next.",
    ),
    once(
      "crew-up",
      "Crewed up",
      "Finish your hero's story for day three.",
      "Every hero needs someone. Pip knows who.",
    ),
    once(
      "big-play",
      "The big play",
      "Finish your hero's story for day four.",
      "Launch Day changes everything. Follow the gold beacon.",
    ),
    once(
      "dream",
      "The dream",
      "Choose how your hero's dream ends on Moon Night.",
      "Moon Night opens on your dream. Both answers are real.",
    ),
    once(
      "genesis-room",
      "The Genesis Room",
      "Open the last door in the Dungeon with your crew's three words.",
      "Under the party, the door needs a full crew.",
    ),
    once(
      "sha-beach",
      "SHA Beach",
      "Run the oldest tunnel to SHA Beach at sunrise.",
      "The footprints run to the waterline. Do not let the Vests get there first.",
    ),
    once(
      "dear-newbie",
      "A letter from S",
      "Pick up one of S's letters.",
      "They are lying among the flyers on the avenues.",
    ),
    once(
      "the-watcher",
      "Someone is watching",
      "Find the watcher's footprints by frost vision.",
      "Once a day, at the corner of one borough.",
    ),
    once(
      "pulled-the-plug",
      "Pull the plug",
      "Find the bot farm under Rug Row and pull the plug.",
      "Something in a Rug Row basement hums. Only frost vision shows it.",
    ),
    once(
      "dead-locker",
      "Dead locker",
      "Open a dead locker with three street words.",
      "Three scraps of paper in The Exchange spell it out.",
    ),
    once(
      "diamond-hands",
      "Diamond hands",
      "Buy the coin before the Great Airdrop and hold it all the way through.",
      "Winter is when the island finds out what it really owns.",
    ),
    once(
      "touching-grass",
      "Touch grass",
      "Let FOMO climb, then sit in the Old Floe park until it is gone.",
      "The park is the one place the billboards cannot reach.",
    ),
    once(
      "based",
      "Based",
      "Warn someone else about a scam.",
      "Spot one, then tell Frost, or warn the crowd when your story asks.",
    ),
    once(
      "saved-the-rest",
      "Saved the rest",
      "Stop a draining pocket at the hideout terminal with DUN still in it.",
      "A seed paper in a pocket or on a phone gets found. Race home.",
    ),
    once(
      "moved-up",
      "Moved up",
      "Buy a new home from the realtor.",
      "Rank opens the studio, the rowhouse and the house with a yard.",
    ),
    once(
      "fresh-fit",
      "Fresh fit",
      "Buy something from the fit shop.",
      "Gloves, shades and a hooded parka, each with a use.",
    ),
    once(
      "lantern",
      "Message to the gods",
      "Send a lantern up from the lantern ground after dark.",
      "Write your message, pick a wish, and watch it rise with thousands more.",
    ),
    once(
      "joyride",
      "Joyride",
      "Take a car parked on the street.",
      "The window breaks, and a star of heat comes with the keys.",
    ),
    once(
      "to-the-moon",
      "To the moon",
      "Buy a seat on the shuttle to the moon colony.",
      "Five hundred thousand DUN. Most who get there rode a lucky moonshot.",
    ),
  ],
  network: betaTarget.chainId,
  rewards: { templateId: "game-rewards", templateVersion: "1.0.0" },
  schemaVersion: 1,
  summary:
    "Wake up broke in a 3D island city of crypto degens and climb to the top.",
  tags: ["action", "strategy"],
  title: "Degen Dungeon",
  verification: {
    replay: {
      id: "degen-dungeon",
      sha256:
        "00cd172f754e808663839ad2412ff952db5300342f93df37ab39024edca263a7",
      version: 1,
    },
  },
  version: "0.1.0",
});
