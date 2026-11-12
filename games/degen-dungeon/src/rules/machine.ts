import { coin } from "./coin.ts";
import {
  echoTicks,
  faucetDun,
  gigRep,
  paradoxHeat,
  reach,
  statueRank,
  tipDun,
} from "./constants.ts";
import { heated, rankOf } from "./heat.ts";
import { heroes } from "./heroes.ts";
import type { DayState, Draft, Point } from "./types.ts";
import { centreOf, spotNamed } from "./world.ts";

// The Time Machine. The Ice Runner, a statue in The Old Floe, sleeps until the hero reaches the top; then it rises, and stepping up to it
// ends the day inside the machine. The day after is a trip back to day one (`loop` 1 or more), where the hero's newbie self is living that
// first day: waking outside home, then in the Faucet line, then in front of a scam. Each can be met once, and each answer bends the
// timeline (`fate`) for better or worse. One answer is a gamble: the same tip helps a careful newbie and ruins a reckless one.
export const statue: Point = { x: 32_500, z: 6_000 };

export const moments = ["echo-wake", "echo-faucet", "echo-offer"] as const;
export type Moment = (typeof moments)[number];
export type Echo = Point & { readonly id: Moment };

export const inReach = (from: Point, place: Point): boolean =>
  Math.max(Math.abs(from.x - place.x), Math.abs(from.z - place.z)) <= reach;

// The statue is up on every trip back (the traveller has just stepped out of it), and on any day the hero's worth reaches the top.
export const risen = (
  day: Pick<DayState, "freezer" | "loop" | "pocket">,
): boolean => day.loop > 0 || rankOf(day) >= statueRank;

// Whether this trip's newbie wastes what they are handed. The seed decides, and the page shows a tell before the answer.
export const recklessOn = (day: Pick<DayState, "loop" | "seed">): boolean =>
  coin(day.seed, 0x51_ed_27_0b + day.loop);

const nearer = (from: number, to: number): number =>
  from + Math.sign(to - from) * 900;

// Where the newbie is on a tick of a trip back: a third of the day at each place. Nobody is there on a day of the story.
export function echoAt(
  day: Pick<DayState, "hero" | "loop" | "tick">,
): Echo | null {
  if (day.loop === 0) return null;
  const stage = Math.min(2, Math.floor(day.tick / echoTicks));
  if (stage === 1) return { id: "echo-faucet", x: 18_000, z: 18_000 };
  if (stage === 2) return { id: "echo-offer", x: 26_500, z: 18_000 };
  const centre = centreOf(heroes[day.hero]?.borough ?? 4);
  const home = spotNamed(`home-${String(day.hero)}`) ?? centre;
  return {
    id: "echo-wake",
    x: nearer(home.x, centre.x),
    z: nearer(home.z, centre.z),
  };
}

// A step of the timeline. Brighter is remembered as good standing; darker is a paradox, and paradoxes bring heat.
function drift(day: Draft, by: number): void {
  day.fate += by;
  if (by > 0) day.rep += gigRep * by;
  else heated(day, paradoxHeat * -by);
}

// The act button beside the statue or the newbie: null when it is done, why it cannot be, or undefined when neither is in reach.
export function actMachine(day: Draft): string | null | undefined {
  if (inReach(day, statue)) {
    if (day.loop > 0) return "the machine is cooling down";
    if (!risen(day)) return "the statue is asleep";
    day.cause = "machine";
    day.ended = true;
    return null;
  }
  const echo = echoAt(day);
  if (echo === null || !inReach(day, echo)) return undefined;
  if (day.done.includes(echo.id)) return "you two have talked already";
  day.talk = echo.id;
  return null;
}

// Yes or no to the newbie (undefined when it is not the newbie who is waiting). No is always walking on. Waking up: yes hands over a tip,
// which a careful newbie keeps and a reckless one wastes; walking on lets them find their feet. The Faucet line: yes cuts in and drains it
// first. The scam: yes warns them off it; walking on lets them learn the hard way.
export function pickMachine(
  day: Draft,
  yes: boolean,
): string | null | undefined {
  const id = moments.find((moment) => moment === day.talk);
  if (id === undefined) return undefined;
  if (id === "echo-wake" && yes && day.pocket < tipDun) return "not enough DUN";
  day.talk = null;
  day.done = [...day.done, id];
  if (id === "echo-wake") {
    if (yes) day.pocket -= tipDun;
    drift(day, yes ? (recklessOn(day) ? -2 : 2) : 1);
  } else if (id === "echo-faucet") {
    if (yes) day.pocket += faucetDun;
    drift(day, yes ? -2 : 1);
  } else drift(day, yes ? 2 : -1);
  return null;
}
