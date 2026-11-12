import { startState, stepInt } from "@frostbite/game-sdk/seeded";

import {
  catchRadius,
  dayPockets,
  frozenFine,
  gustTicks,
  heatFadeTicks,
  maxTicks,
  patch,
  stormDay,
  stormStart,
  stormTicks,
  swapMeetBonus,
  tuxGap,
  tuxStars,
} from "./constants.ts";
import { cooled, starsOf } from "./heat.ts";
import { moved } from "./move.ts";
import type { DayState, Draft } from "./types.ts";
import { centreOf, inSwapMeet, spotNamed } from "./world.ts";

// Whether the offer the seed decides is a scam today. The seed is mixed first, so seeds that are near each other do not agree.
function scamToday(seed: number): boolean {
  let mixed = Math.imul(seed ^ (seed >>> 16), 0x85_eb_ca_6b);
  mixed = Math.imul(mixed ^ (mixed >>> 13), 0xc2_b2_ae_35);
  return stepInt(startState(mixed ^ (mixed >>> 16)), 2).value === 1;
}

// A day from its first tick: the hero wakes at home with what that story day gives them, and the seed decides today's scam.
export function startDay(seed: number, hero: number, day: number): DayState {
  const home = spotNamed(`home-${String(hero)}`) ?? centreOf(4);
  return {
    cause: null,
    crew: [],
    crooked: scamToday(seed),
    day,
    dir: -1,
    done: [],
    ended: false,
    fenced: 0,
    freezer: 0,
    gigs: 0,
    heat: 0,
    hero,
    hot: 0,
    inputs: 0,
    level: 0,
    made: 0,
    parcel: null,
    peak: 0,
    pocket: dayPockets[day - 1] ?? 0,
    rep: 0,
    ride: "foot",
    rides: 0,
    rugged: 0,
    seed: seed >>> 0,
    shook: false,
    spotted: 0,
    storm: 0,
    talk: null,
    tick: 0,
    tools: 0,
    tux: null,
    words: 0,
    x: home.x,
    z: home.z,
  };
}

const toward = (from: number, to: number, pace: number): number =>
  from + Math.max(-pace, Math.min(pace, to - from));

// At three stars a tux appears a little way off and walks straight at the hero, through walls, a little faster for every star. It never
// runs, and it is always closer than it was. What it reaches on the ground is frozen: the loot goes back, a fine is paid, the day is over.
function chased(day: Draft): void {
  const stars = starsOf(day.heat);
  if (stars < tuxStars) {
    day.tux = null;
    return;
  }
  const from = day.tux ?? {
    x: day.x + (day.x < tuxGap ? tuxGap : -tuxGap),
    z: day.z,
  };
  const pace = 6 + 2 * stars;
  const tux = {
    x: toward(from.x, day.x, pace),
    z: toward(from.z, day.z, pace),
  };
  day.tux = tux;
  const near = Math.max(Math.abs(tux.x - day.x), Math.abs(tux.z - day.z));
  if (day.level > 0 || near > catchRadius) return;
  day.cause = "frozen";
  day.ended = true;
  day.dir = -1;
  day.hot = 0;
  day.talk = null;
  day.pocket -= Math.min(day.pocket, frozenFine);
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

function stormed(day: Draft): void {
  if (day.day !== stormDay) return;
  if (day.tick < stormStart || day.tick >= stormStart + stormTicks) return;
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
    chased(day);
    if (day.heat > 0 && day.tick % heatFadeTicks === 0) cooled(day, 1);
    stormed(day);
    if (day.tick >= maxTicks && !day.ended) {
      day.cause = "timeout";
      day.ended = true;
    }
  }
  return day;
}
