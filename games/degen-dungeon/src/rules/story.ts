import {
  chapters,
  dreams,
  genesis,
  party,
  type Beat,
  type Gift,
  type Need,
} from "./chapters.ts";
import { lastDay, moonNight } from "./calendar.ts";
import { drainPace, tunnel, vestGap } from "./constants.ts";
import { cooled, heated, starsOf } from "./heat.ts";
import { inReach } from "./places.ts";
import type { DayState, Draft } from "./types.ts";

// The story: up to three quests a day for seven days, done in order. The first two days are the same for everyone and are read from the
// day itself: the riot morning (hear Frost's speech, write the seed paper; crossing the riot itself is a side quest), then a first day of
// honest hustle (a gig, a ride on the Green Line, a trade on the Exchange floor). Days three to five are each hero's own beats (`chapters.ts`). Moon Night opens on the
// hero's dream, then the party under Moon Tower, then a lantern sent up after dark. On the last day a crew is gathered, the crew's three
// words open the Genesis Room, and the oldest tunnel runs to SHA Beach. Everything else in the city is a side quest (`sides.ts`).
export type Quest =
  | "beach"
  | "beat-0"
  | "beat-1"
  | "beat-2"
  | "crew"
  | "gig"
  | "lantern"
  | "paper"
  | "ride"
  | "speech"
  | "trade";
const beats: readonly Quest[] = ["beat-0", "beat-1", "beat-2"];
const plans: readonly (readonly Quest[])[] = [
  ["speech", "paper"],
  ["gig", "ride", "trade"],
  beats,
  beats,
  beats,
  ["beat-0", "beat-1", "lantern"],
  ["crew", "beat-0", "beach"],
];
export const questsOn = (day: number): readonly Quest[] => plans[day - 1] ?? [];

const crewNeeded = genesis.need?.crewSize ?? 2;
const met: Readonly<Record<Quest, (day: DayState) => boolean>> = {
  beach: (day) => day.cause === "beach",
  "beat-0": (day) => day.beat > 0,
  "beat-1": (day) => day.beat > 1,
  "beat-2": (day) => day.beat > 2,
  crew: (day) => day.crew.length >= crewNeeded,
  gig: (day) => day.gigs > 0,
  lantern: (day) => day.done.includes("lantern"),
  paper: (day) => day.paper > 0,
  ride: (day) => day.rides > 0,
  speech: (day) => day.done.includes("speech"),
  trade: (day) => day.bag > 0 || day.sells > 0,
};
export const questDone = (day: DayState, quest: Quest): boolean =>
  met[quest](day);

// The quest the hero is on: the first of today's not yet done; none on a trip back, or once all of them are done.
export const questOf = (day: DayState): Quest | null =>
  day.loop > 0
    ? null
    : (questsOn(day.day).find((quest) => !met[quest](day)) ?? null);
// Whether today's story is told: all of its quests done.
export const storyTold = (day: DayState): boolean =>
  day.loop === 0 && questOf(day) === null;

export function chapterOf(hero: number, day: number): readonly Beat[] {
  if (day === moonNight) {
    const dream = dreams[hero];
    return dream === undefined ? [] : [dream, party];
  }
  if (day === lastDay) return [genesis];
  return chapters[hero]?.[day - 3] ?? [];
}

// The beat the hero is on, or null on the first two days, on a trip back, and once the day's beats are told.
export const beatOf = (
  day: Pick<DayState, "beat" | "day" | "hero" | "loop">,
): Beat | null =>
  day.loop > 0 ? null : (chapterOf(day.hero, day.day)[day.beat] ?? null);

function unmet(day: Draft, need: Need | undefined): string | null {
  if (need === undefined) return null;
  const crew = need.crew;
  if (crew !== undefined && !day.crew.some((mate) => crew.includes(mate)))
    return "this needs the right crewmate";
  if (day.crew.length < (need.crewSize ?? 0)) return "this needs a full crew";
  if (day.gigs < (need.gigs ?? 0)) return "finish more gigs first";
  if (day.rides < (need.rides ?? 0)) return "ride the Green Line first";
  if (need.traded === true && day.bag === 0 && day.sells === 0)
    return "trade on the Exchange floor first";
  if (need.vision === true && !day.looking) return "only frost vision shows it";
  if (need.cool === true && starsOf(day.heat) >= 3)
    return "lose the heat first";
  if (day.pocket < (need.pay ?? 0)) return "not enough DUN";
  return null;
}

function give(day: Draft, gift: Gift | undefined): void {
  if (gift === undefined) return;
  const dun = gift.dun ?? 0;
  day.pocket = Math.max(0, day.pocket + dun);
  day.rep = Math.max(0, day.rep + (gift.rep ?? 0));
  day.fomo = Math.max(0, Math.min(100, day.fomo + (gift.fomo ?? 0)));
  day.peakFomo = Math.max(day.peakFomo, day.fomo);
  const heat = gift.heat ?? 0;
  if (heat > 0) heated(day, heat);
  if (heat < 0) cooled(day, -heat);
  if (gift.drain === true) day.drain = Math.max(day.drain, drainPace);
  if (gift.rug === true) day.rugged += 1;
  if (gift.spot === true) day.spotted += 1;
  if (gift.warn === true) day.warned += 1;
}

// Where the hero comes out once the last door opens, and where the Vests start behind them.
export const tunnelMouth = { x: (tunnel.x0 + tunnel.x1) / 2, z: -200 };

function told(day: Draft, beat: Beat): void {
  day.beat += 1;
  if (beat !== genesis) return;
  day.gate = 1;
  day.ride = "foot";
  day.level = 0;
  day.dir = -1;
  day.x = tunnelMouth.x;
  day.z = tunnelMouth.z;
  day.vests = { x: tunnelMouth.x, z: tunnelMouth.z + vestGap };
}

// The act button at the beat's place: null when done, why not, or undefined when the beat is not in reach.
export function actStory(day: Draft): string | null | undefined {
  const beat = beatOf(day);
  if (beat === null || !inReach(day, beat.at)) return undefined;
  const reason = unmet(day, beat.need);
  if (reason !== null) return reason;
  day.pocket -= beat.need?.pay ?? 0;
  if (beat.pick !== undefined) {
    day.talk = "beat";
    return null;
  }
  give(day, beat.gift);
  told(day, beat);
  return null;
}

// One of a beat's two answers (undefined when no beat is waiting). On Moon Night the first beat's answer is the dream.
export function pickStory(
  day: Draft,
  choice: number,
): string | null | undefined {
  if (day.talk !== "beat") return undefined;
  const beat = beatOf(day);
  const gift = beat?.pick?.[choice];
  if (beat === null || gift === undefined) return "pick one of the two";
  day.talk = null;
  give(day, gift);
  if (day.day === moonNight && day.beat === 0) day.dream = choice + 1;
  told(day, beat);
  return null;
}
