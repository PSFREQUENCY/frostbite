// Everything the rules measure, in whole numbers: a place is in centimetres on the island's floor (x runs east, z runs south), a time is
// in ticks (the screen runs thirty a second, the rules know only ticks). Nothing here is a float, so every engine plays a day the same way.
export const gameId = "degen-dungeon";
export const verifierId = "degen-dungeon";
export const verifierVersion = 1;

export const ticksPerSecond = 30;
// One run is one day, at most ten minutes long, which bounds the work of one replay.
export const maxTicks = 18_000;
// A day's record holds at most this many inputs, which keeps it well under the platform's 64 KB.
export const maxInputs = 1_200;

// Nakasato is three boroughs by three, and a borough is 120 metres a side.
export const block = 12_000;
export const island = 36_000;
// Boats and helicopters may go this far past the shore. North of the fog line lies SHA Beach, which nobody reaches: they are turned round.
export const sea = 5_000;
export const shore = 200;
export const fogLine = -3_000;
// A street runs through the middle of every borough each way. Buildings fill the four corners: from the first to the second number of
// each pair, measured from the borough's own corner, on both axes.
export const lots = [
  [800, 5_000],
  [7_000, 11_200],
] as const;
export const bodyRadius = 40;
// How near a spot must be (on both axes) to act on it.
export const reach = 300;

// Heat is the wanted level: a hundred points a star, five stars at most. At three stars a tux comes, and what it touches is frozen.
export const heatPerStar = 100;
export const maxHeat = 500;
export const tuxStars = 3;
export const tuxGap = 3_000;
export const catchRadius = 150;
// Heat falls a point every this many ticks.
export const heatFadeTicks = 30;
export const lootHeat = 160;
export const borrowHeat = 150;
export const frozenFine = 250;
export const rebrandCool = 300;
export const lineCool = 60;

// The Great Airdrop: on its day DUN falls for a minute. The ground is cut in patches, and each patch has a new gust every few seconds.
export const stormDay = 3;
export const stormStart = 7_200;
export const stormTicks = 1_800;
export const patch = 1_000;
export const gustTicks = 150;
export const swapMeetBonus = 8;

// Net worth at which each rank begins (Newbie, Shrimp, Crab, Dolphin, Shark, Whale), and what a story day starts with in the pocket.
export const rankFloors = [0, 1_000, 5_000, 25_000, 100_000, 500_000] as const;
export const dayPockets = [0, 600, 3_000, 12_000, 60_000] as const;
export const faucetDun = 100;
export const gigRep = 10;
export const lootRep = 20;
