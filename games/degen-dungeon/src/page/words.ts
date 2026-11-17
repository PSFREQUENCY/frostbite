import { ticksPerSecond } from "../rules/constants.ts";
import { stages } from "../rules/course.ts";
import { clockOf, dashPar, stageOf } from "../rules/dash.ts";
import { invading, peaceable } from "../rules/invasion.ts";
import { heroes } from "../rules/heroes.ts";
import { echoAt, recklessOn } from "../rules/machine.ts";
import { priceAt } from "../rules/market.ts";
import { spotNamed } from "../rules/places.ts";
import { lastDay, moonNight } from "../rules/calendar.ts";
import { questDone, questOf, questsOn, type Quest } from "../rules/story.ts";
import { motors, type DayState, type Weather } from "../rules/types.ts";
import {
  echoPlaces,
  echoTells,
  offers,
  recruitLine,
  tells,
} from "../script/cast.ts";
import { drivingLine, trialLines } from "../script/dash.ts";
import { dreams, finale } from "../script/dreams.ts";
import { questLines, talks, tunnelLine } from "../script/lines.ts";
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

// The weather readout's words.
export const weatherNames: Readonly<Record<Weather, string>> = {
  blizzard: "Blizzard",
  clear: "Clear skies",
  fog: "Thick fog",
  gale: "Gale",
  heat: "Heatwave",
  snow: "Snow",
  storm: "Thunderstorm",
};

// A clock's ticks as minutes and seconds.
export const clockText = (ticks: number): string => {
  const seconds = Math.max(0, Math.floor(ticks / ticksPerSecond));
  return `${String(Math.floor(seconds / 60))}:${String(seconds % 60).padStart(2, "0")}`;
};

// Pip's line on a Degen Dash: the stage, what it asks, and the clock against par.
export function dashLine(day: DayState): string | null {
  const stage = stageOf(day);
  if (stage === null) return null;
  const driving =
    stage.trial === "car" && motors.some((ride) => ride === day.ride);
  const asks = driving ? drivingLine : trialLines[stage.trial];
  return `Degen Dash ${String(day.dash)}/${String(stages.length)} · ${asks} · ${clockText(clockOf(day))} (par ${clockText(dashPar)})`;
}

// What is urgent before the story: a drain (or a balance that only looks drained), the saucers, the open tunnel, a Degen Dash on, a trip
// back.
function urgentLine(day: DayState): string | null {
  if (day.drain > 0)
    return "Your balance is draining! Race home to the hideout terminal.";
  if (day.fake) return "Check the hideout terminal at home before you panic.";
  if (invading(day))
    return peaceable(day) || day.bag > 0
      ? "Saucers over the city! Stand still in a beam and get taken up."
      : "Saucers over the city! Grab glow sticks and a pizza, or a bag of meme coins, then stand in a beam.";
  if (day.gate > 0) return tunnelLine;
  const dash = dashLine(day);
  if (dash !== null) return dash;
  if (day.loop === 0) return null;
  const echo = echoAt(day);
  return echo === null || day.done.includes(echo.id)
    ? "Bend the timeline, then sleep it off."
    : `Find your newbie self, ${echoPlaces[echo.id] ?? "somewhere in town"}.`;
}

// What one of today's quests asks: the street days' own lines, a hero's beat, the dream, the party, the last door, the tunnel.
export function questLineOf(day: DayState, quest: Quest): string {
  if (quest === "beach") return tunnelLine;
  if (!quest.startsWith("beat-")) return questLines[quest] ?? told;
  const beat = Number(quest.slice(5));
  if (day.day === moonNight)
    return beat === 0 ? (dreams[day.hero]?.line ?? told) : finale.party;
  if (day.day === lastDay) return finale.genesis;
  return stories[day.hero]?.[day.day - 3]?.[beat]?.line ?? told;
}

// What the quest the hero is on asks; once all three are done, that the day's story is told (and on the first morning, home to bed).
export function questLine(day: DayState): string {
  const quest = questOf(day);
  if (quest !== null) return questLineOf(day, quest);
  return day.day === 1 ? (questLines.home ?? told) : told;
}

// Pip's line: what is urgent, or which of today's three quests the hero is on and what it asks.
export function goalFor(day: DayState): string {
  const urgent = urgentLine(day);
  if (urgent !== null) return urgent;
  const quests = questsOn(day.day);
  const done = quests.filter((quest) => questDone(day, quest)).length;
  const on = Math.min(done + 1, quests.length);
  return `${String(on)}/${String(quests.length)} · ${questLine(day)}`;
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
    if (day.day === moonNight && day.beat === 0) {
      const dream = dreams[day.hero];
      return dream === undefined
        ? null
        : { answers: dream.answers, say: dream.line };
    }
    const words = stories[day.hero]?.[day.day - 3]?.[day.beat];
    return words?.answers === undefined
      ? null
      : { answers: words.answers, say: words.line };
  }
  const talk = talks[id];
  if (talk !== undefined)
    return {
      answers: talk.answers,
      say: talk.say
        .replace("{price}", String(priceAt(day.seed, day.day, day.tick)))
        .replace("{time}", clockText(day.dashTime))
        .replace("{par}", clockText(dashPar)),
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
