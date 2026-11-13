import { chased } from "./chase.ts";
import { coin } from "./coin.ts";
import {
  boons,
  dayFreezers,
  dayPockets,
  gustTicks,
  loopPocket,
  maxTicks,
  patch,
  stormDay,
  stormStart,
  stormTicks,
  swapMeetBonus,
  visionTicks,
} from "./constants.ts";
import { statue } from "./machine.ts";
import { moved } from "./move.ts";
import { spotNamed } from "./places.ts";
import { ticked } from "./tick.ts";
import type { DayState, Draft } from "./types.ts";
import { centreOf, inSwapMeet } from "./world.ts";

// A day from its first tick: the hero wakes at home with what that story day gives them (the timeline from earlier trips back moves the
// pocket a hundred DUN a step), and the seed decides today's scam. The third day is the morning of the drain. A trip back (`loop` above
// 0) starts beside the statue instead, with a traveller's pocket. `boon` is last night's lantern wish (1 to 4), which the seed may answer.
export function startDay(
  seed: number,
  hero: number,
  day: number,
  loop = 0,
  fate = 0,
  boon = 0,
): DayState {
  const home =
    loop > 0 ? statue : (spotNamed(`home-${String(hero)}`) ?? centreOf(4));
  // A lantern wish from last night is answered, or not, by the seed. What it brings is in `boons`.
  const answered = loop === 0 && boon > 0 && coin(seed, 0xb0_07) ? boon : 0;
  const gift = boons[answered] ?? 0;
  const pocket =
    (loop > 0
      ? loopPocket
      : Math.max(0, (dayPockets[day - 1] ?? 0) + 100 * fate)) +
    (answered === 4 ? gift : 0);
  return {
    allIns: 0,
    answered,
    bag: 0,
    beat: 0,
    cause: null,
    cop: null,
    crew: [],
    crooked: coin(seed),
    day,
    dir: -1,
    done: [],
    drain: 0,
    dream: 0,
    ended: false,
    fake: day === 3 && loop === 0,
    fate: loop > 0 ? 0 : fate,
    fenced: 0,
    firstBuy: -1,
    fomo: 0,
    freezer:
      (loop > 0 ? 0 : (dayFreezers[day - 1] ?? 0)) +
      (answered === 3 ? gift : 0),
    gait: 0,
    gate: 0,
    gigs: 0,
    grass: false,
    heat: 0,
    hero,
    hot: 0,
    inputs: 0,
    letters: 0,
    level: 0,
    looking: false,
    loop,
    made: 0,
    maxx: 0,
    paid: 0,
    paper: 0,
    paperAt: -1,
    paperHands: 0,
    parcel: null,
    peak: 0,
    peakFomo: 0,
    peakPocket: pocket,
    pocket,
    rep: answered === 2 ? gift : 0,
    ride: "foot",
    rides: 0,
    rugged: 0,
    saved: false,
    seed: seed >>> 0,
    sells: 0,
    shook: false,
    spotted: 0,
    storm: 0,
    talk: null,
    tick: 0,
    tools: 0,
    topped: 0,
    tux: null,
    vests: null,
    vision:
      (hero === 2 ? 2 * visionTicks : visionTicks) +
      (answered === 1 ? gift : 0),
    warned: 0,
    wish: 0,
    words: 0,
    x: home.x,
    z: home.z,
  };
}

// How much DUN falls on a patch of ground in one tick of the Great Airdrop, from 0 to 7: the same for every player of a seed, and new for
// each patch every few seconds. The rules count by patch, never flake by flake, so a storm of millions replays exactly.
export function gust(seed: number, x: number, z: number, tick: number): number {
  const mixed = Math.imul(
    seed ^
      Math.imul(Math.floor(x / patch), 0x9e_37_79_b1) ^
      Math.imul(Math.floor(z / patch), 0x85_eb_ca_6b) ^
      Math.imul(Math.floor(tick / gustTicks), 0xc2_b2_ae_35),
    0x27_d4_eb_2f,
  );
  return ((mixed ^ (mixed >>> 15)) >>> 0) % 8;
}

// What bare hands catch, then with the magnet, the vacuum, and both.
const pull = [1, 3, 4, 8] as const;

export const storming = (day: Pick<DayState, "day" | "tick">): boolean =>
  day.day === stormDay &&
  day.tick >= stormStart &&
  day.tick < stormStart + stormTicks;

// Only what the hero runs through is caught: standing still catches nothing.
function stormed(day: Draft): void {
  if (!storming(day) || day.dir < 0) return;
  const fall =
    gust(day.seed, day.x, day.z, day.tick) +
    (inSwapMeet(day.x, day.z) ? swapMeetBonus : 0);
  const caught = fall * (pull[day.tools] ?? 1);
  day.storm += caught;
  day.pocket += caught;
}

// The day as it stands on `tick`: everything that happens with no new choice from the player. Advancing in two steps ends in the same
// place as advancing in one, which is what lets the page keep a day up to date tick by tick and the platform replay it input by input.
export function advance(state: DayState, tick: number): DayState {
  if (state.ended || tick <= state.tick) return state;
  const day: Draft = { ...state };
  while (day.tick < tick && !day.ended) {
    day.tick += 1;
    moved(day);
    ticked(day);
    if (!day.ended) chased(day);
    stormed(day);
    if (day.tick >= maxTicks && !day.ended) {
      day.cause = "timeout";
      day.ended = true;
    }
  }
  return day;
}
