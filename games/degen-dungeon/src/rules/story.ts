import {
  chapters,
  dreams,
  genesis,
  party,
  type Beat,
  type Gift,
  type Need,
} from "./chapters.ts";
import { drainPace, tunnel, vestGap } from "./constants.ts";
import { cooled, heated, starsOf } from "./heat.ts";
import { inReach } from "./places.ts";
import type { DayState, Draft } from "./types.ts";

// The story of a day. The first morning is the same for everyone and is read as goals from the day itself: cross the riot, hear Frost's
// speech, write the seed paper, finish a gig, sleep at home. From day two each hero has their own beats (`chapters.ts`); the last day is
// the dream, the party under Moon Tower and the Genesis Room, after which the oldest tunnel runs to SHA Beach.
export const dayOneGoals = ["riot", "speech", "paper", "gig", "home"] as const;
export type DayOneGoal = (typeof dayOneGoals)[number];

export function dayOneGoal(day: DayState): DayOneGoal | null {
  if (day.day !== 1 || day.loop > 0) return null;
  if (!day.done.includes("riot")) return "riot";
  if (!day.done.includes("speech")) return "speech";
  if (day.paper === 0) return "paper";
  if (day.gigs === 0) return "gig";
  return day.cause === "home" ? null : "home";
}

export function chapterOf(hero: number, day: number): readonly Beat[] {
  if (day === 5) {
    const dream = dreams[hero];
    return dream === undefined ? [] : [dream, party, genesis];
  }
  return chapters[hero]?.[day - 2] ?? [];
}

// The beat the hero is on, or null on the first morning, on a trip back, and once the day's story is told.
export const beatOf = (
  day: Pick<DayState, "beat" | "day" | "hero" | "loop">,
): Beat | null =>
  day.loop > 0 ? null : (chapterOf(day.hero, day.day)[day.beat] ?? null);

export const chapterDone = (
  day: Pick<DayState, "beat" | "day" | "hero" | "loop">,
): boolean =>
  day.loop === 0 &&
  day.day > 1 &&
  day.beat >= chapterOf(day.hero, day.day).length;

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

// One of a beat's two answers (undefined when no beat is waiting). On the last day the first beat's answer is the dream.
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
  if (day.day === 5 && day.beat === 0) day.dream = choice + 1;
  told(day, beat);
  return null;
}
