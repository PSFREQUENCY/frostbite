import { heroes } from "../rules/heroes.ts";
import { echoAt, recklessOn } from "../rules/machine.ts";
import { priceAt } from "../rules/market.ts";
import { spotNamed } from "../rules/places.ts";
import { chapterDone, dayOneGoal } from "../rules/story.ts";
import type { DayState } from "../rules/types.ts";
import {
  echoPlaces,
  echoTells,
  offers,
  recruitLine,
  tells,
} from "../script/cast.ts";
import { dreams, finale } from "../script/dreams.ts";
import { dayOneLines, talks, tunnelLine } from "../script/lines.ts";
import { stories } from "../script/stories.ts";

// The words the page puts beside the picture: the rank's name, Pip's line for what the day is about, and what a talk says with the answers
// it offers. None of it changes the rules.
export const rankNames = [
  "Newbie",
  "Shrimp",
  "Crab",
  "Dolphin",
  "Shark",
  "Whale",
] as const;

const told = "Today's story is told. Hustle on, or go home and sleep.";

// Pip's line: what today is about, or what is urgent.
export function goalFor(day: DayState): string {
  if (day.drain > 0)
    return "Your balance is draining! Race home to the hideout terminal.";
  if (day.fake) return "Check the hideout terminal at home before you panic.";
  if (day.gate > 0) return tunnelLine;
  if (day.loop > 0) {
    const echo = echoAt(day);
    return echo === null || day.done.includes(echo.id)
      ? "Bend the timeline, then sleep it off."
      : `Find your newbie self, ${echoPlaces[echo.id] ?? "somewhere in town"}.`;
  }
  if (day.day === 1) return dayOneLines[dayOneGoal(day) ?? "home"] ?? told;
  if (chapterDone(day)) return told;
  if (day.day === 5)
    return day.beat === 0
      ? (dreams[day.hero]?.line ?? told)
      : day.beat === 1
        ? finale.party
        : finale.genesis;
  return stories[day.hero]?.[day.day - 2]?.[day.beat]?.line ?? told;
}

// Whether the player can see a scam's tell: frost vision, sharp smarts, or street smarts from scams already walked away from.
export const canTell = (day: DayState): boolean =>
  day.looking || (heroes[day.hero]?.smarts ?? 0) >= 4 || day.spotted >= 2;

const yesNo = ["Yes", "Walk away"] as const;

// What is waiting for an answer, and the answers, in the order the rules take them.
export function talkOf(
  day: DayState,
): { readonly answers: readonly string[]; readonly say: string } | null {
  const id = day.talk;
  if (id === null) return null;
  if (id === "beat") {
    if (day.day === 5 && day.beat === 0) {
      const dream = dreams[day.hero];
      return dream === undefined
        ? null
        : { answers: dream.answers, say: dream.line };
    }
    const words = stories[day.hero]?.[day.day - 2]?.[day.beat];
    return words?.answers === undefined
      ? null
      : { answers: words.answers, say: words.line };
  }
  const talk = talks[id];
  if (talk !== undefined)
    return {
      answers: talk.answers,
      say: talk.say.replace(
        "{price}",
        String(priceAt(day.seed, day.day, day.tick)),
      ),
    };
  const spot = spotNamed(id);
  const scam = spot?.kind === "offer" && (spot.crooked ?? day.crooked);
  const tell = scam && canTell(day) ? ` ${tells[id] ?? ""}` : "";
  const say = offers[id] ?? recruitLine(spot?.label ?? "Someone");
  const newbie =
    id === "echo-wake"
      ? `${echoTells[recklessOn(day) ? "reckless" : "careful"]} `
      : "";
  return { answers: yesNo, say: `${newbie}${say}${tell}` };
}
