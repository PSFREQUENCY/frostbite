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

// Degen Dungeon 1: one open island city, Nakasato, where a broke newbie wakes up to a mess and climbs over seven story days (three quests
// a day at most, and six side quests beside them) by honest gigs, a crew, the market and staying ahead of the tuxes, to Moon Night, SHA
// Beach and the Time Machine. A run is one day of one hero. Walk-in shops, parked rides, the saucers, the weather, Zuri's Degen Dash (a
// nine-stage race round the city, from the second day), the corner stores and gas stations, the freeze ray, Mount WAGMI and its sign,
// the lantern night and the moon colony fill the city between the story's quests.
// The milestones are the story's (its quests, the Dash won and Moon Night's lantern), ten top skills and the hidden ones.
// The title, the words and every milestone are a draft for the owner; a milestone's id is one the game's rules decide
// (`games/degen-dungeon/src/rules/milestones.ts`).
export const degenDungeonGame = defineGame({
  capabilities: ["milestone:claim", "run:submit"],
  description:
    "Wake up broke in Nakasato, an island city of nine boroughs, and climb from Newbie to Whale in seven days, with up to three story quests and six side quests every day: the FREE FROST riot morning, a first day of honest hustle, the mania, the winter and its Great Airdrop, Launch Day, Moon Night and the morning after. Pick one of ten heroes, each with their own story, and play the whole game as them. Hear Frost's speech, write down your seed words, hustle honest gigs, ride the Green Line, trade the coin of the day, crew up, and spot the scams before they drain you. Walk, run, duck, crawl and climb walls, in at the windows and over the roofs; take a parked car, minivan, pickup, motorbike, scooter or bike, and walk into the shops and landmarks. Nine corner stores sell snacks behind bulletproof glass, and six gas stations sell Fuzzy to anyone with a Nakasato ID. Steal if you must, but every star of heat brings someone: a beat cop, then the tuxes. Frost vision shows hidden words and the tells of a scam. In the mania, flying saucers come for the city: make peace with glow sticks and pizza, and thirteen beam-ups leave you a saucer to fly. From day two, Zuri sells tickets to the Degen Dash, nine stages round the city against the clock, for 50,000 DUN, a trophy and a parade. Then send a lantern up to the crypto gods; on the last morning your crew's three words open the Genesis Room and the tunnel to SHA Beach. Nine masked statues wake once the story is won, and only a statue's face can take the freeze ray from a deli freezer. Hike the trail up Mount WAGMI, climb any letter of its sign and sit on top over the whole city. Milestones for the story, ten top skills and hidden achievements, each one landing as a spinning medallion. DUN is in-game credit only. Every milestone is checked by replaying your day.",
  id: "degen-dungeon",
  launch: { mode: "embedded" },
  milestones: [
    // The story's: one for each of its quests from the seed paper on (Frost's speech and finishing the Degen Dash have none), then the Dash
    // won and Moon Night's lantern.
    once(
      "seed-paper",
      "Write it down",
      "Day 1, quest 2: write down your seed words and choose where the paper lives.",
      "The Faucet comes with a phone and a pen.",
    ),
    once(
      "first-gig",
      "First gig",
      "Day 2, quest 1: take an honest gig and deliver the parcel.",
      "A courier's bag, a door across town, and a little DUN that is all yours.",
    ),
    once(
      "green-line",
      "Green Line",
      "Day 2, quest 2: ride the Green Line Express from one stop to the next.",
      "The loop runs round the whole island. Mind the gap.",
    ),
    once(
      "first-trade",
      "First trade",
      "Day 2, quest 3: buy some of the coin of the day on the Exchange floor.",
      "A candle every ten seconds, and every one of them a story.",
    ),
    once(
      "caught-the-mania",
      "Caught the mania",
      "Day 3, quest 1: do the first thing your hero's story asks in the mania.",
      "Every billboard is a promise. Pip says which one to chase.",
    ),
    once(
      "riding-the-pump",
      "Riding the pump",
      "Day 3, quest 2: do the second thing your hero's story asks in the mania.",
      "Up only, until it isn't.",
    ),
    once(
      "hustle",
      "The hustle",
      "Day 3, quest 3: finish your hero's story for the mania.",
      "Pip's line says where the story goes next.",
    ),
    once(
      "cold-open",
      "Cold open",
      "Day 4, quest 1: do the first thing your hero's story asks in the winter.",
      "A drained-looking morning, a terminal to check, and then the cold.",
    ),
    once(
      "thin-ice",
      "Thin ice",
      "Day 4, quest 2: do the second thing your hero's story asks in the winter.",
      "The Great Airdrop falls today. Not everyone holds.",
    ),
    once(
      "crew-up",
      "Crewed up",
      "Day 4, quest 3: finish your hero's story for the winter.",
      "Every hero needs someone. Pip knows who.",
    ),
    once(
      "countdown",
      "Countdown",
      "Day 5, quest 1: do the first thing your hero's story asks on Launch Day.",
      "Engines warm, robots on the routes, and a gold beacon somewhere.",
    ),
    once(
      "liftoff",
      "Liftoff",
      "Day 5, quest 2: do the second thing your hero's story asks on Launch Day.",
      "Everything goes up. Some of it comes down.",
    ),
    once(
      "big-play",
      "The big play",
      "Day 5, quest 3: finish your hero's story for Launch Day.",
      "Launch Day changes everything. Follow the gold beacon.",
    ),
    once(
      "dream",
      "The dream",
      "Day 6, quest 1: choose how your hero's dream ends on Moon Night.",
      "Moon Night opens on your dream. Both answers are real.",
    ),
    once(
      "moon-party",
      "Moon party",
      "Day 6, quest 3: once the Degen Dash is run, join the party under Moon Tower.",
      "The whole island, one tower, and a moon too big for the sky.",
    ),
    once(
      "full-crew",
      "It takes three",
      "Day 7, quest 1: gather two crewmates on the last morning.",
      "Three people, three words, one door.",
    ),
    once(
      "genesis-room",
      "The Genesis Room",
      "Day 7, quest 2: open the last door in the Dungeon with your crew's three words.",
      "Under Moon Tower, the door needs a full crew.",
    ),
    once(
      "sha-beach",
      "SHA Beach",
      "Day 7, quest 3: run the oldest tunnel to SHA Beach at sunrise.",
      "The footprints run to the waterline. Do not let the Vests get there first.",
    ),
    once(
      "degen-dash",
      "Degen Dash champion",
      "Win the Degen Dash: clear all nine stages round the city under par, with no heat. Zuri sells tickets from day 2; on Moon Night, finishing it is quest 2.",
      "Run, duck, crawl, climb, look, drive and know your stuff. The prize: 50,000 DUN, a trophy, art and a parade.",
    ),
    once(
      "lantern",
      "Message to the gods",
      "Moon Night side quest: send a lantern up from the lantern ground after dark.",
      "Write your message, pick a wish, and watch it rise with thousands more.",
    ),
    // The top skills.
    once(
      "grinder",
      "Grinder",
      "Top skill: finish three deliveries in one day.",
      "Three honest gigs before the day is out.",
    ),
    once(
      "shook-the-tuxes",
      "Shook the tuxes",
      "Top skill: get from three stars of heat to none without being frozen.",
      "They were always closer than they were, until they were gone.",
    ),
    once(
      "storm-funnel",
      "The funnel",
      "Top skill: catch 100,000 DUN in the Great Airdrop.",
      "A magnet, a vacuum and the right place to stand.",
    ),
    once(
      "diamond-hands",
      "Diamond hands",
      "Top skill: buy the coin before the Great Airdrop and hold it all the way through.",
      "Winter is when the island finds out what it really owns.",
    ),
    once(
      "scam-spotted",
      "Not today",
      "Top skill: walk away from a crooked offer.",
      "You saw the scam for what it was and walked.",
    ),
    once(
      "based",
      "Based",
      "Top skill: warn someone else about a scam.",
      "Spot one, then tell Frost, or warn the crowd when your story asks.",
    ),
    once(
      "saved-the-rest",
      "Saved the rest",
      "Top skill: stop a draining pocket at the hideout terminal with DUN still in it.",
      "A seed paper in a pocket or on a phone gets found. Race home.",
    ),
    once(
      "touching-grass",
      "Touch grass",
      "Top skill: let FOMO climb, then sit in the Old Floe park until it is gone.",
      "The park is the one place the billboards cannot reach.",
    ),
    once(
      "road-trip",
      "Road trip",
      "Top skill: take five kinds of ride from the kerb in one day: bike, scooter, car, motorbike, pickup or minivan.",
      "Pedals, a deck, a saddle and two engines, all in one day.",
    ),
    once(
      "rooftop-runner",
      "Rooftop runner",
      "Top skill: climb a building's wall all the way up and step out onto its roof.",
      "Three storeys, hand over hand, and the whole street under your feet.",
    ),
    // Hidden: their words are riddles, so they stay secrets to find.
    once(
      "time-machine",
      "The Ice Runner rises",
      "Hidden: reach the top and see which statue wakes.",
      "Some statues are only waiting.",
    ),
    once(
      "butterfly-effect",
      "Butterfly effect",
      "Hidden: go back, change something, and come home to a different present.",
      "One small flap of a wing, and your pocket and your look are not what they were.",
    ),
    once(
      "sub-zero",
      "Sub-Zero",
      "Hidden: hold thirty-six frozen at once with the freeze ray.",
      "Somewhere in a corner store freezer, the cold is waiting for a statue's face.",
    ),
    once(
      "nine-masks",
      "Nine masks",
      "Hidden: once the story is won, wear every borough's face in one day.",
      "Every borough's runner, one after another.",
    ),
    once(
      "to-the-moon",
      "To the moon",
      "Hidden: some moonshots pay for a seat, and the shuttle waits under Moon Tower.",
      "Five hundred thousand DUN, one way, helmet included.",
    ),
    once(
      "the-watcher",
      "Someone is watching",
      "Hidden: once a day, at the corner of one borough, there are footprints only frost vision shows.",
      "A hooded parka, never the same corner twice.",
    ),
    once(
      "pulled-the-plug",
      "Pull the plug",
      "Hidden: something in a Rug Row basement hums, and only frost vision shows it.",
      "Nobody pays the power bill on a bot farm.",
    ),
    once(
      "dead-locker",
      "Dead locker",
      "Hidden: three scraps of paper in The Exchange spell out how to open something nobody uses.",
      "Lockers keep secrets longer than people do.",
    ),
    once(
      "intergalactic-otc",
      "Intergalactic OTC",
      "Hidden: when the saucers come, not everyone aboard wants pizza.",
      "They paid three times what the market would.",
    ),
    // A top achievement, counted over the days: the visitors' own saucer.
    once(
      "saucer-pilot",
      "Saucer pilot",
      "Make peace or trade aboard the visitors' saucers thirteen times over the days, then fly the saucer they leave you.",
      "A soft hum, a warm light, and the whole island under you.",
    ),
  ],
  network: betaTarget.chainId,
  rewards: { templateId: "game-rewards", templateVersion: "1.0.0" },
  schemaVersion: 1,
  summary:
    "Wake up broke in a 3D island city of crypto degens and climb to the top.",
  tags: ["action", "strategy"],
  title: "Degen Dungeon 1",
  verification: {
    replay: {
      id: "degen-dungeon",
      sha256:
        "3654f0daaffc72aa353dd02dc1448ed3a98f7ea7596481f3f70de4e4e1d8319a",
      version: 1,
    },
  },
  version: "0.1.0",
});
