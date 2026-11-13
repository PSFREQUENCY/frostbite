import {
  fieldsOf,
  refuse,
  tickNamed,
  withFields,
} from "@frostbite/game-sdk/run-inputs";
import type { GameVerifier, RunInput } from "@frostbite/game-sdk/run-record";

import { act, lift, look, pick } from "./acts.ts";
import {
  maxInputs,
  maxLoops,
  maxTicks,
  verifierId,
  verifierVersion,
} from "./constants.ts";
import { advance, startDay } from "./day.ts";
import { scoreOf } from "./heat.ts";
import { heroes } from "./heroes.ts";
import { earnedBy } from "./milestones.ts";
import type { DayState, Draft } from "./types.ts";

// The rules, as a pure state machine: the same seed, settings and inputs always play a day out the same way, which is what lets the
// platform replay a run it issued a seed for. A run is one day of one hero.
//
// Settings: `hero` (0 to 9, see `heroes.ts`) and `day` (1 to 5, the story day, which fixes what the hero starts with). A trip back through
// the Time Machine adds `loop` (1 to 9) and is always to day 1 (see `machine.ts`). A story day may carry the timeline those trips left,
// `fate` (-9 to 9), which moves the starting pocket a hundred DUN a step.
// Inputs, each with the `tick` it was made on: `move` `{ dir }` holds a heading (0 to 15, or -1 to stand); `act` uses the nearest spot;
// `pick` `{ choice }` answers what is waiting (0 yes and 1 no to an offer, or one of up to four answers to a talk); `lift` `{ by }` takes
// a helicopter up or down a level (1 or -1); `look` turns frost vision on or off; `end` closes the day. Between inputs the day runs on by itself (`advance`). A day that is not closed counts as it stands at its last input.
const fieldsFor = new Map<string, readonly string[]>([
  ["act", ["tick"]],
  ["end", ["tick"]],
  ["lift", ["by", "tick"]],
  ["look", ["tick"]],
  ["move", ["dir", "tick"]],
  ["pick", ["choice", "tick"]],
]);

const whole = (value: unknown, low: number, high: number): number | null =>
  typeof value === "number" &&
  Number.isInteger(value) &&
  value >= low &&
  value <= high
    ? value
    : null;

function change(
  day: Draft,
  type: string,
  fields: Readonly<Record<string, unknown>>,
): string | null {
  if (type === "act") return act(day);
  if (type === "look") return look(day);
  if (type === "move") {
    const dir = whole(fields.dir, -1, 15);
    if (dir === null) return "dir must be a heading from -1 to 15";
    day.dir = dir;
    return null;
  }
  if (type === "pick") {
    const choice = whole(fields.choice, 0, 3);
    return choice === null ? "choice must be 0 to 3" : pick(day, choice);
  }
  const by = whole(fields.by, -1, 1);
  return by === null || by === 0 ? "by must be 1 or -1" : lift(day, by);
}

export const degenRules: GameVerifier<DayState> = {
  earned: earnedBy,
  id: verifierId,
  init(seed, config) {
    const trip = fieldsOf(config, ["day", "hero", "loop"]);
    const carried = fieldsOf(config, ["day", "fate", "hero"]);
    const fields =
      typeof trip !== "string"
        ? trip
        : typeof carried !== "string"
          ? carried
          : fieldsOf(config, ["day", "hero"]);
    if (typeof fields === "string")
      return refuse("a day takes exactly: day, hero");
    const hero = whole(fields.hero, 0, heroes.length - 1);
    const day = whole(fields.day, 1, 5);
    const loop = typeof trip === "string" ? 0 : whole(trip.loop, 1, maxLoops);
    const fate = typeof carried === "string" ? 0 : whole(carried.fate, -9, 9);
    if (hero === null || day === null)
      return refuse("hero must be 0 to 9 and day 1 to 5");
    if (fate === null) return refuse("fate must be -9 to 9");
    return loop === null || (loop > 0 && day !== 1)
      ? refuse("a trip back is loop 1 to 9, and always to day 1")
      : { ok: true, state: startDay(seed, hero, day, loop, fate) };
  },
  // What the day made, once it is over: the number the game shows and keeps as the player's best day.
  score: (state) => (state.ended ? scoreOf(state) : null),
  step(state, input: RunInput) {
    if (state.ended) return refuse("the day has ended");
    const names = fieldsFor.get(input.type);
    if (names === undefined) return refuse(`no such input: ${input.type}`);
    return withFields(input.data, names, (fields) => {
      const tick = tickNamed(fields.tick, state.tick, maxTicks);
      if (typeof tick === "string") return refuse(tick);
      const now = advance(state, tick);
      if (input.type === "end")
        return {
          ok: true,
          state: now.ended ? now : { ...now, cause: "closed", ended: true },
        };
      if (now.ended) return refuse("the day ended before this");
      if (now.inputs >= maxInputs) return refuse("the day's record is full");
      const day: Draft = { ...now, inputs: now.inputs + 1 };
      const reason = change(day, input.type, fields);
      return reason === null ? { ok: true, state: day } : refuse(reason);
    });
  },
  version: verifierVersion,
};
