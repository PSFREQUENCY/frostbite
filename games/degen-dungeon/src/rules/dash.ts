import { onTheRoof, storeys } from "./climb.ts";
import { roll } from "./coin.ts";
import { heatPerStar } from "./constants.ts";
import { quizStage, stages, type Stage } from "./course.ts";
import { invading } from "./invasion.ts";
import { inReach } from "./places.ts";
import { roomAt } from "./rooms.ts";
import { motors, type DayState, type Draft, type Point } from "./types.ts";
import { onMoon } from "./world.ts";

// The Degen Dash, from the second day on: Miss Mirinda, its host, sells a ticket (`ticketPrice`) at her arch, and now and then walks up to
// a hero on foot without one (`zuriTicks`) and waits beside them until they take her up on it or walk off. With a ticket, acting at the
// arch starts the clock, and each of the course's stages (`course.ts`) is cleared by reaching its gate the right way: running, crouching,
// crawling, at the top of a wall, on the roof, with frost vision on, in anything with an engine, with the right answer to the question at
// the desk (a wrong one adds `quizPenalty` to the clock), and back at the arch. Under par (`dashPar`) and with no heat is a win: the top
// prize (`dashPrize`) once a day, the trophy, the champion's print and a parade. Slower is a finish and a medal; past `dashMax` the course
// closes.
export const ticketPrice = 250;
export const dashPrize = 50_000;
export const medalPrize = 1_000;
export const dashPar = 3_000;
export const dashMax = 10_800;
export const quizPenalty = 300;
export const quizRight: readonly number[] = [0, 1, 2, 0];
export const zuriTicks: readonly number[] = [2_700, 8_100, 13_500];
// How far off a hero can walk before Miss Mirinda gives up on them.
const zuriGone = 900;

const near = (from: Point, to: Point, gap: number): boolean =>
  Math.max(Math.abs(from.x - to.x), Math.abs(from.z - to.z)) <= gap;
// The stage the hero is on (null when no run is on), the question at the desk today, and the run's clock with any penalty.
export const stageOf = (day: Pick<DayState, "dash">): Stage | null =>
  day.dash > 0 ? (stages[day.dash - 1] ?? null) : null;
export const quizOf = (day: Pick<DayState, "day" | "seed">): number =>
  roll(day.seed, 0x0d_a5 + day.day, quizRight.length);
export const clockOf = (day: Pick<DayState, "dashFrom" | "tick">): number =>
  day.tick - day.dashFrom;
// Miss Mirinda is beside the hero, near enough to talk to.
export const zuriNear = (
  day: Pick<DayState, "level" | "ride" | "x" | "z" | "zuri">,
): boolean =>
  day.zuri !== null &&
  day.ride === "foot" &&
  day.level === 0 &&
  inReach(day, day.zuri);

// Whether the hero clears the stage they are on just now.
export function clears(day: DayState, stage: Stage): boolean {
  if (!inReach(day, stage)) return false;
  const foot = day.ride === "foot" && day.level === 0;
  switch (stage.trial) {
    case "run":
      return foot && day.gait === 1;
    case "duck":
      return foot && day.gait === 2;
    case "crawl":
      return foot && day.gait === 3;
    case "wall":
      return day.ride === "foot" && day.level === storeys;
    case "roof":
      return onTheRoof(day);
    case "look":
      return foot && day.looking;
    case "car":
      return motors.some((ride) => ride === day.ride);
    case "finish":
      return true;
    case "quiz":
      return false;
  }
}

// Acting at the arch on foot: with a ticket the clock starts; without one Miss Mirinda sells one.
export function startDash(day: Draft): string | null {
  if (day.dash > 0) return "the Dash is on: make for the next gate";
  if (day.tickets === 0) {
    day.talk = "zuri";
    return null;
  }
  day.tickets -= 1;
  day.dash = 1;
  day.dashFrom = day.tick;
  day.zuri = null;
  return null;
}

// Acting at the desk: today's question, at the eighth gate.
export function askAtDesk(day: Draft): string | null {
  if (day.dash !== quizStage) return "the desk asks at the eighth gate";
  day.talk = `quiz-${String(quizOf(day))}`;
  return null;
}

// The Dash's answers: Miss Mirinda's ticket bought or turned down, and the question answered right or wrong.
export function dashDeed(day: Draft, name: string): string | null {
  if (name === "dash-ticket") {
    if (day.tickets > 0) return "you have a ticket already";
    if (day.pocket < ticketPrice) return "not enough DUN";
    day.pocket -= ticketPrice;
    day.tickets = 1;
    day.zuri = null;
    return null;
  }
  if (name === "dash-pass") {
    day.zuri = null;
    return null;
  }
  if (day.dash !== quizStage) return "the clock has run out";
  if (name === "dash-wrong") day.dashFrom -= quizPenalty;
  else day.dash += 1;
  return null;
}

// The Dash's talks, for `talk.ts`: Miss Mirinda's ticket, the questions (a wrong answer asks again) and what the clock said.
export const dashNodes: Readonly<
  Record<string, readonly { readonly does?: string; readonly to?: string }[]>
> = {
  zuri: [{ does: "dash-ticket" }, { does: "dash-pass" }],
  ...Object.fromEntries(
    quizRight.map((right, quiz) => [
      `quiz-${String(quiz)}`,
      [0, 1, 2].map((answer) =>
        answer === right
          ? { does: "dash-right" }
          : { does: "dash-wrong", to: `quiz-${String(quiz)}` },
      ),
    ]),
  ),
  "dash-done": [{}],
  "dash-out": [{}],
  "dash-won": [{}],
};

// Over the line: under par with no heat wins the top prize (once a day), anything else is a finish and a medal (once a day). The run's
// time is kept, and the tick it stopped (for the parade).
function finish(day: Draft): void {
  const time = clockOf(day);
  const won = time <= dashPar && day.heat < heatPerStar;
  const prize =
    won && !day.done.includes("dash-won")
      ? dashPrize
      : day.done.includes("dash-finished")
        ? 0
        : medalPrize;
  day.pocket += prize;
  day.made += prize;
  day.done = [
    ...new Set([...day.done, "dash-finished", ...(won ? ["dash-won"] : [])]),
  ];
  day.dash = 0;
  day.dashTime = time;
  day.dashFrom = day.tick;
  if (day.talk === null) day.talk = won ? "dash-won" : "dash-done";
}

// Whether Miss Mirinda may walk up: a hero on foot in the street with no ticket and nothing else going on, on a story day from the second.
const free = (day: DayState): boolean =>
  day.day >= 2 &&
  day.loop === 0 &&
  day.tickets === 0 &&
  day.zuri === null &&
  day.talk === null &&
  !day.ended &&
  day.ride === "foot" &&
  day.level === 0 &&
  day.drain === 0 &&
  !day.fake &&
  day.gate === 0 &&
  !invading(day) &&
  !day.done.includes("dash-won") &&
  roomAt(day.x, day.z) === null &&
  !onMoon(day.x, day.z);

// Each tick: a run's clock and its gates; with no run on, Miss Mirinda walking up at her hours (the last one passed, if the hero was busy)
// and walking off once the hero is out of sight.
export function dashed(day: Draft): void {
  const stage = stageOf(day);
  if (stage !== null) {
    if (clockOf(day) > dashMax) {
      day.dash = 0;
      day.dashTime = 0;
      if (day.talk === null || day.talk.startsWith("quiz-"))
        day.talk = "dash-out";
      return;
    }
    if (!clears(day, stage)) return;
    if (stage.trial === "finish") finish(day);
    else day.dash += 1;
    return;
  }
  if (day.zuri !== null && !near(day, day.zuri, zuriGone)) day.zuri = null;
  const due = zuriTicks.filter((at) => at <= day.tick).length;
  const mark = `zuri-${String(due)}`;
  if (due === 0 || day.done.includes(mark) || !free(day)) return;
  day.zuri = { x: day.x, z: day.z };
  day.done = [...day.done, mark];
}

// The champion's parade, for half a minute after a Degen Dash is won (the crowd lines the avenue, `crowd.ts`).
export const paradeTicks = 900;
export const paradeOn = (
  day: Pick<DayState, "dash" | "dashFrom" | "dashTime" | "done" | "tick">,
): boolean =>
  day.dash === 0 &&
  day.dashTime > 0 &&
  day.dashTime <= dashPar &&
  day.done.includes("dash-won") &&
  day.tick - day.dashFrom < paradeTicks;
