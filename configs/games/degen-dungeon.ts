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

// Degen Dungeon: one open island city, Nakasato, where a broke newbie wakes up to a mess and climbs by honest gigs, a crew, and staying
// ahead of the tuxes. A run is one day of one hero. The title, the words and every milestone are a draft for the owner; a milestone's id
// is one the game's rules decide (`games/degen-dungeon/src/rules/milestones.ts`).
export const degenDungeonGame = defineGame({
  capabilities: ["milestone:claim", "run:submit"],
  description:
    "Wake up broke in Nakasato, an island city of nine boroughs, and make it to the top. Pick a hero, take your first DUN from the Faucet, carry parcels, recruit a crew of three, ride the Green Line Express, and tell the honest offers from the scams. Steal and the heat rises: at three stars an agent in a black tuxedo walks straight at you, and what it touches is frozen. Nobody is ever hurt. DUN is in-game credit, earned by playing and never bought or sold. Every milestone is checked by replaying your day.",
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
  ],
  network: betaTarget.chainId,
  rewards: { templateId: "game-rewards", templateVersion: "1.0.0" },
  schemaVersion: 1,
  summary:
    "Wake up broke in a 3D island city of crypto degens and climb to the top.",
  tags: ["adventure", "3d"],
  title: "Degen Dungeon",
  verification: {
    replay: {
      id: "degen-dungeon",
      sha256:
        "0194f95107a03070698db5e27a976a2d80314d8b1ccad4210b51e2e46c97510f",
      version: 1,
    },
  },
  version: "0.1.0",
});
