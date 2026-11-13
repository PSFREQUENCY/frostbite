import {
  createRunRecorder,
  type RunRecord,
} from "@frostbite/game-sdk/run-record";

import { gameId, verifierId, verifierVersion } from "./rules/constants.ts";
import { advance } from "./rules/day.ts";
import { degenRules } from "./rules/index.ts";
import type { DayState } from "./rules/types.ts";

export type Outcome =
  { readonly ok: true } | { readonly ok: false; readonly reason: string };

// What a player can choose: the one act button, frost vision, a helicopter's climb or drop, a heading to hold, and an answer (0 yes and 1
// no to an offer, or one of a talk's answers).
export type Choice =
  | { readonly by: number; readonly type: "lift" }
  | { readonly choice: number; readonly type: "pick" }
  | { readonly dir: number; readonly type: "move" }
  | { readonly type: "act" | "look" };

// One day as the player plays it. The page calls `tick` on its timer and `send` when the player chooses; the rules decide what is legal,
// and each choice they accept (with the tick it was made on) is written into a run record. Only choices are recorded, never the ticks
// between them: a heading held again is not a choice. There is no screen and no clock in this module.
export interface RunSession {
  // The tick the day is on now.
  clock(): number;
  // The milestones the day has earned so far.
  earned(): readonly string[];
  // Closes the day if it is still going and returns its record.
  record(): RunRecord;
  send(choice: Choice): Outcome;
  state(): DayState;
  // One tick. A day that a tux or the clock ends is closed.
  tick(): void;
}

export interface RunSessionOptions {
  readonly day: number;
  readonly hero: number;
  // The timeline a story day carries from trips back (-9 to 9), and 1 or more on a trip back itself; 0 or left out otherwise.
  readonly fate?: number;
  readonly loop?: number;
  // Called once for each milestone the day earns, as soon as it is earned.
  readonly onEarned?: (milestone: string) => void;
  readonly seed: number;
}

const finished: Outcome = { ok: false, reason: "the day has ended" };

export function createRunSession(options: RunSessionOptions): RunSession {
  const story = { day: options.day, hero: options.hero };
  const loop = options.loop ?? 0;
  const fate = options.fate ?? 0;
  const config =
    loop > 0 ? { ...story, loop } : fate !== 0 ? { ...story, fate } : story;
  const init = degenRules.init(options.seed, config);
  if (!init.ok) throw new Error(init.reason);
  let state = init.state;
  // Whether the record already says how the day ended: a choice ended it (going home), or the closing input is written.
  let closed = false;
  const announced = new Set<string>();
  const recorder = createRunRecorder({
    config,
    gameId,
    seed: options.seed,
    verifier: verifierId,
    verifierVersion,
  });

  function announce(): void {
    for (const milestone of degenRules.earned(state)) {
      if (announced.has(milestone)) continue;
      announced.add(milestone);
      options.onEarned?.(milestone);
    }
  }

  // The closing input names the tick the day stopped on, so a replay runs the day on to the same tick and meets the same end.
  function close(): void {
    if (closed) return;
    closed = true;
    const data = { tick: state.tick };
    const stepped = degenRules.step(state, { data, type: "end" });
    if (stepped.ok) state = stepped.state;
    recorder.input("end", data);
    announce();
  }

  return {
    clock: () => state.tick,
    earned: () => degenRules.earned(state),
    record() {
      close();
      return recorder.finish(degenRules.earned(state));
    },
    send(choice) {
      if (state.ended) return finished;
      if (choice.type === "move" && choice.dir === state.dir)
        return { ok: true };
      const { type, ...rest } = choice;
      const data = { ...rest, tick: state.tick };
      const stepped = degenRules.step(state, { data, type });
      if (!stepped.ok) return stepped;
      recorder.input(type, data);
      state = stepped.state;
      closed = state.ended;
      announce();
      return { ok: true };
    },
    state: () => state,
    tick() {
      if (state.ended) return;
      state = advance(state, state.tick + 1);
      announce();
      if (state.ended) close();
    },
  };
}
