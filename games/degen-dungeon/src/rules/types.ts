// One day in Nakasato, as the rules hold it. Everything is a whole number or a name, so a replay ends exactly where the player did.
export type Ride = "boat" | "car" | "foot" | "heli" | "scooter";
// How a day ended: closed by the player, frozen by a tux, asleep at home, or out of time.
export type Cause = "closed" | "frozen" | "home" | "timeout";

export interface Point {
  readonly x: number;
  readonly z: number;
}

export interface DayState {
  readonly cause: Cause | null;
  // The heroes who have joined today, two at most (a crew is three with the lead).
  readonly crew: readonly number[];
  // Whether the offer the seed decides is a scam today.
  readonly crooked: boolean;
  readonly day: number;
  // The heading held, one of sixteen (0 is east, 4 south, 8 west, 12 north), or -1 standing still.
  readonly dir: number;
  // The spots used up today (each can be used once).
  readonly done: readonly string[];
  readonly ended: boolean;
  readonly fenced: number;
  readonly freezer: number;
  // Honest gigs finished today.
  readonly gigs: number;
  readonly heat: number;
  readonly hero: number;
  // What the loot being carried is worth.
  readonly hot: number;
  readonly inputs: number;
  // How high a helicopter is: 0 is on the ground.
  readonly level: number;
  // DUN earned today by gigs, honest offers and fencing (the airdrop is counted apart, in `storm`).
  readonly made: number;
  // The spot a carried delivery is for.
  readonly parcel: string | null;
  // The most heat reached today.
  readonly peak: number;
  readonly pocket: number;
  readonly rep: number;
  readonly ride: Ride;
  // Green Line rides today.
  readonly rides: number;
  // Scams fallen for, and scams walked away from.
  readonly rugged: number;
  readonly seed: number;
  // Heat fell from three stars or more to none without a freeze.
  readonly shook: boolean;
  readonly spotted: number;
  // DUN caught in the Great Airdrop.
  readonly storm: number;
  // The spot whose offer is waiting for a yes or a no.
  readonly talk: string | null;
  readonly tick: number;
  // Bit 1 is the magnet, bit 2 the vacuum.
  readonly tools: number;
  readonly tux: Point | null;
  readonly words: number;
  readonly x: number;
  readonly z: number;
}

// A day being worked on inside one step of the rules, before it is handed back as the next state.
export type Draft = { -readonly [Key in keyof DayState]: DayState[Key] };
