// One day in Nakasato, as the rules hold it. Everything is a whole number or a name, so a replay ends exactly where the player did.
export type Ride =
  | "bike"
  | "board"
  | "boat"
  | "car"
  | "foot"
  | "heli"
  | "hover"
  | "moto"
  | "saucer"
  | "scooter"
  | "semi"
  | "truck"
  | "van";
// The rides that fly: the helicopter, and the saucer that is the hero's once the visitors know them well (`invasion.ts`).
export const flies = (ride: Ride): ride is "heli" | "saucer" =>
  ride === "heli" || ride === "saucer";
// The rides that stand on the street: some pedalled or kicked, the rest with engines (`motors`).
export type Wheels =
  "bike" | "car" | "moto" | "scooter" | "semi" | "truck" | "van";
export const motors: readonly Wheels[] = [
  "car",
  "moto",
  "semi",
  "truck",
  "van",
];
// A ride the hero stepped off, which stays where it was left and can be taken again: its id, kind and place.
export interface Left {
  readonly id: string;
  readonly ride: Wheels;
  readonly x: number;
  readonly z: number;
}
// How a day ended: taken up by the saucers, closed by the player, frozen by a tux, asleep at home, inside the Time Machine, out of time,
// on SHA Beach at sunrise, or with Max's Vests first to the beach.
export type Cause =
  | "abducted"
  | "beach"
  | "closed"
  | "frozen"
  | "home"
  | "machine"
  | "timeout"
  | "vested";
// The sky over the island: clear, or a spell of harsh weather (`weather.ts`).
export type Weather =
  "blizzard" | "clear" | "fog" | "gale" | "heat" | "snow" | "storm";

export interface Point {
  readonly x: number;
  readonly z: number;
}
// Something frozen by the freeze ray: a crowd's member, a ride, someone at a place, or a chaser, and the tick it thaws on.
export interface Frost {
  readonly id: string;
  readonly until: number;
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
  // The loft's upgrades bought so far (`lofts.ts`): 0, then the patio, the balcony and the view of the city.
  readonly loft: number;
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
  // A moonshot in the air: the DUN staked (0 for none) and the tick of the launch it rides on.
  readonly shot: number;
  readonly shotAt: number;
  // The parked ride under the hero (its spot's id, or "" for none or a hired one), and the rides left on the street (the last six).
  readonly rideId: string;
  readonly left: readonly Left[];
  // The statue whose mask the hero wears (`statues.ts`), or -1 for their own face; and whether the story has been won (the last day
  // ended on SHA Beach), which is what wakes the statues' masks.
  readonly form: number;
  readonly won: boolean;
  // The weather now, and how long the hero has stood in a saucer's beam (ticks).
  readonly weather: Weather;
  readonly beamed: number;
  // Beam-ups on earlier days (`invasion.ts`): the page's word, as `fate` is, carried from its save.
  readonly beamups: number;
  readonly words: number;
  // The Degen Dash (`dash.ts`): the stage the hero is on (1 to 9, or 0 with no run on), the tick its clock started (once over the line, the
  // tick it stopped), the last finish's time in ticks, the tickets held, and where Miss Mirinda waits after walking up with one.
  readonly dash: number;
  readonly dashFrom: number;
  readonly dashTime: number;
  readonly tickets: number;
  readonly zuri: Point | null;
  // The heading the hero last moved on (0 to 15), which the freeze ray fires along.
  readonly facing: number;
  // The freeze ray (`freeze.ts`): whether the hero carries it, the tick of the last shot, what is frozen and until when, and the most
  // frozen at once today.
  readonly gun: boolean;
  readonly rayAt: number;
  // The purse snatcher on the first morning while he runs (`errands.ts`), and which leg of his way out he is on.
  readonly thief: Point | null;
  // Food (`food.ts`): the tick of the last meal, when a stream from The Dome VR began (-1 off air), and the Diamond Hands gang beside the
  // hero, if they have walked up.
  readonly ateAt: number;
  readonly streamFrom: number;
  readonly gang: Point | null;
  // The hero's power (`powers.ts`): when it was last used, and until when a charge quickens the pace and the ram senses S's letter.
  readonly powerAt: number;
  readonly boostUntil: number;
  readonly senseUntil: number;
  // Until when the dragon is in the air, and whether it flies high (`flight.ts`).
  readonly flyUntil: number;
  readonly flyHigh: boolean;
  // The hero's own business, the Green Line and the skate park (`business.ts`): the tick the shop's till was last emptied, the train
  // ride under way, and the ticks skated in the park today.
  readonly tillAt: number;
  readonly line: Train | null;
  readonly skated: number;
  readonly thiefLeg: number;
  readonly frozen: readonly Frost[];
  readonly peakFrozen: number;
  // Haus De Savage (`haus.ts`, `deal.ts`): the floor the hero is on (0 the ground), the glass elevator ride under way, whether the Fancy
  // Lot's hover car is the hero's, whether the sky penthouse is (its keycard opens the top floors), and the Diamond Hands job on (0 none).
  readonly floor: number;
  readonly elevator: Elevator | null;
  readonly hover: boolean;
  readonly keycard: boolean;
  readonly dhJob: number;
  // A Nakasato ID, carried from day to day once made (`stores.ts`), and a Fuzzy's fizz left (ticks).
  readonly idCard: boolean;
  readonly fizz: number;
  readonly x: number;
  readonly z: number;
}

// A ride on the Green Line: the tick it set off, where the hero boarded, and the borough of the stop it runs to.
export interface Train {
  readonly at: number;
  readonly from: Point;
  readonly to: number;
}

// A ride in Haus De Savage's glass elevator: the tick it set off, and the floors it runs from and to.
export interface Elevator {
  readonly at: number;
  readonly from: number;
  readonly to: number;
}

// A day being worked on inside one step of the rules, before it is handed back as the next state.
export type Draft = { -readonly [Key in keyof DayState]: DayState[Key] };
