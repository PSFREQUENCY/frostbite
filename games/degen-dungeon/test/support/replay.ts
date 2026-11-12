import type { RunRecord } from "@frostbite/game-sdk/run-record";

import { degenRules } from "../../src/rules/index.ts";
import type { DayState } from "../../src/rules/types.ts";

// Plays a record through the rules as the platform would, and answers the day it ends on.
export function replay(
  record: Pick<RunRecord, "config" | "inputs" | "seed">,
): DayState {
  const init = degenRules.init(record.seed, record.config);
  if (!init.ok) throw new Error(init.reason);
  let state = init.state;
  for (const input of record.inputs) {
    const stepped = degenRules.step(state, input);
    if (!stepped.ok) throw new Error(stepped.reason);
    state = stepped.state;
  }
  return state;
}

export function started(seed: number, hero: number, day: number): DayState {
  const init = degenRules.init(seed, { day, hero });
  if (!init.ok) throw new Error(init.reason);
  return init.state;
}

// Why the rules refuse an input, or null if they take it.
export function refusal(
  state: DayState,
  type: string,
  data: Readonly<Record<string, unknown>>,
): string | null {
  const stepped = degenRules.step(state, { data: data as never, type });
  return stepped.ok ? null : stepped.reason;
}
