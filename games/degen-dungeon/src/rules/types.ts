// One day in Nakasato, as the rules hold it. Everything is a whole number or a name, so a replay ends exactly where the player did.
export type Ride = "bike" | "boat" | "car" | "foot" | "heli" | "scooter";
// How a day ended: closed by the player, frozen by a tux, asleep at home, inside the Time Machine, out of time, on SHA Beach at sunrise,
// or with Max's Vests first to the beach.
export type Cause =
  "beach" | "closed" | "frozen" | "home" | "machine" | "timeout" | "vested";

export interface Point {
  readonly x: number;
  readonly z: number;
}

export interface DayState {
  // All-in bets made today.
  readonly allIns: number;
  // The lantern wish from the night before that the crypto gods answered this morning (1 to 4, see `boons`), or 0.
  readonly answered: number;
  // The coin held, in hundredths of a coin, and the DUN paid for it.
  readonly bag: number;
  // The next beat of today's story (days 2 to 5; day one's goals are read from the day itself).
  readonly beat: number;
  readonly cause: Cause | null;
  // A beat cop on a scooter, out at two stars.
  readonly cop: Point | null;
  // The heroes who have joined today, two at most (a crew is three with the lead). 10 is Bit, the robot.
  readonly crew: readonly number[];
  // Whether the offer the seed decides is a scam today.
  readonly crooked: boolean;
  readonly day: number;
  // The heading held, one of sixteen (0 is east, 4 south, 8 west, 12 north), or -1 standing still.
  readonly dir: number;
  // Everything used up or decided today, by name: spots, talks, purchases, story moments.
  readonly done: readonly string[];
  // DUN draining from the pocket each tick, and whether a drain was stopped with something left.
  readonly drain: number;
  // The dream chosen on the last day: 0 not yet, 1 or 2.
  readonly dream: number;
  readonly ended: boolean;
  // The morning of the drain: the freezer and the rank look gone until the hideout terminal shows otherwise.
  readonly fake: boolean;
  // How far a trip back has bent the timeline (or, on a story day, the timeline the player brings): above 0 brighter, below darker.
  readonly fate: number;
  readonly fenced: number;
  // The tick of the first buy today, or -1.
  readonly firstBuy: number;
  // Fear of missing out, 0 to 100, and the most it reached.
  readonly fomo: number;
  readonly freezer: number;
  // 1 once the Genesis Room is open and the oldest tunnel with it.
  readonly gate: number;
  // How the hero moves on foot: 0 walking, 1 running, 2 crouching, 3 crawling.
  readonly gait: number;
  // Honest gigs finished today.
  readonly gigs: number;
  // FOMO came down to nothing in the park after climbing.
  readonly grass: boolean;
  readonly heat: number;
  readonly hero: number;
  // What the loot being carried is worth.
  readonly hot: number;
  readonly inputs: number;
  // S's letters picked up today.
  readonly letters: number;
  // How high a helicopter is: 0 is on the ground.
  readonly level: number;
  // Frost vision is on.
  readonly looking: boolean;
  // 0 on a day of the story; 1 or more on a trip back to day one through the Time Machine.
  readonly loop: number;
  // DUN earned today by gigs, honest offers, fencing and trades that paid (the airdrop is counted apart, in `storm`).
  readonly made: number;
  // DUN in a MAXX Exchange account.
  readonly maxx: number;
  readonly paid: number;
  // Where the seed paper lives (0 unwritten, 1 pocket, 2 mattress, 3 phone, 4 freezer), and the tick it was written on.
  readonly paper: number;
  readonly paperAt: number;
  // Sales made just before the coin ran.
  readonly paperHands: number;
  // The spot a carried delivery is for.
  readonly parcel: string | null;
  // The most heat, FOMO and pocket reached today.
  readonly peak: number;
  readonly peakFomo: number;
  readonly peakPocket: number;
  readonly pocket: number;
  readonly rep: number;
  readonly ride: Ride;
  // Green Line rides today.
  readonly rides: number;
  // Scams fallen for.
  readonly rugged: number;
  readonly saved: boolean;
  readonly seed: number;
  readonly sells: number;
  // Heat fell from three stars or more to none without a freeze.
  readonly shook: boolean;
  // Scams walked away from.
  readonly spotted: number;
  // DUN caught in the Great Airdrop.
  readonly storm: number;
  // What is waiting for an answer: an offer's spot, a talk's node, a story beat or the newbie of a trip back.
  readonly talk: string | null;
  readonly tick: number;
  // Bit 1 is the magnet, bit 2 the vacuum.
  readonly tools: number;
  // Buys made near the day's top price.
  readonly topped: number;
  readonly tux: Point | null;
  // Max's Vests, behind the hero in the oldest tunnel.
  readonly vests: Point | null;
  // Frost vision left today, in ticks.
  readonly vision: number;
  // Strangers warned about a scam.
  readonly warned: number;
  // The wish sent up on a lantern tonight (0 none, 1 to 4).
  readonly wish: number;
  readonly words: number;
  readonly x: number;
  readonly z: number;
}

// A day being worked on inside one step of the rules, before it is handed back as the next state.
export type Draft = { -readonly [Key in keyof DayState]: DayState[Key] };
