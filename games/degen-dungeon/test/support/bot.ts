import type { RunInput } from "@frostbite/game-sdk/run-record";

import { block, island } from "../../src/rules/constants.ts";
import { advance } from "../../src/rules/day.ts";
import { degenRules } from "../../src/rules/index.ts";
import { paceOf } from "../../src/rules/move.ts";
import type { DayState } from "../../src/rules/types.ts";
import { spotNamed } from "../../src/rules/places.ts";
import { roomAt } from "../../src/rules/rooms.ts";
import { centreOf } from "../../src/rules/world.ts";

// A player for the tests: it walks the streets (every spot stands on one), uses spots by name and answers offers, by legal inputs only.
// What it did is in `inputs`, which is a day's record.
export function createBot(
  seed = 7,
  hero = 7,
  day = 1,
  loop = 0,
  fate = 0,
  boon = 0,
) {
  const init = degenRules.init(seed, {
    day,
    hero,
    ...(loop === 0 ? {} : { loop }),
    ...(fate === 0 ? {} : { fate }),
    ...(boon === 0 ? {} : { boon }),
  });
  if (!init.ok) throw new Error(init.reason);
  let state = init.state;
  let now = 0;
  const inputs: RunInput[] = [];

  const send = (
    type: string,
    more: Readonly<Record<string, number>> = {},
  ): void => {
    const data = { ...more, tick: now };
    const stepped = degenRules.step(state, { data, type });
    if (!stepped.ok)
      throw new Error(`${type} on tick ${String(now)}: ${stepped.reason}`);
    state = stepped.state;
    inputs.push({ data, type });
  };
  const here = (): DayState => advance(state, now);

  // Holds a heading for a number of ticks, then stands.
  const hold = (dir: number, ticks: number): void => {
    send("move", { dir });
    now += ticks;
    send("move", { dir: -1 });
  };
  // Walks along one axis until the place is passed (or a wall or the shore is in the way).
  const leg = (axis: "x" | "z", to: number): void => {
    const gap = to - here()[axis];
    const pace = paceOf(state);
    if (Math.abs(gap) < pace) return;
    const dir = axis === "x" ? (gap > 0 ? 0 : 8) : gap > 0 ? 4 : 12;
    hold(dir, Math.ceil(Math.abs(gap) / pace));
  };
  const within = (value: number): number =>
    Math.max(0, Math.min(island - 1, value));
  const centreNear = (x: number, z: number) =>
    centreOf(Math.floor(within(x) / block) + 3 * Math.floor(within(z) / block));
  // Whether a line east to west at this z runs along a street or an avenue.
  const across = (z: number): boolean => {
    const local = within(z) % block;
    return local < 800 || (local > 5_000 && local < 7_000) || local > 11_200;
  };
  // To the middle of the borough the bot is in, along the streets to the middle of the borough the place is in, then to the place (by
  // the avenue first when the place is on one).
  const go = (x: number, z: number): void => {
    // Out of a shop by its doorway first.
    const room = roomAt(here().x, here().z);
    if (room !== null) {
      leg("x", room.counter.x);
      leg("z", room.north ? room.door.z0 - 200 : room.door.z1 + 200);
    }
    const from = here();
    for (const stage of [centreNear(from.x, from.z), centreNear(x, z)]) {
      leg("x", stage.x);
      leg("z", stage.z);
    }
    if (across(z)) leg("z", z);
    leg("x", x);
    leg("z", z);
  };

  return {
    act: (): void => send("act"),
    end: (): void => send("end"),
    // Walks (0), runs (1), crouches (2) or crawls (3) from now on.
    gait: (mode: number): void => send("gait", { mode }),
    go,
    here,
    // Sets off on a heading and keeps going.
    head: (dir: number): void => send("move", { dir }),
    hold,
    inputs,
    lift: (by: number): void => send("lift", { by }),
    look: (): void => send("look"),
    // Yes (0) or no (1), or one of a talk's answers by number.
    pick: (answer: boolean | number): void =>
      send("pick", {
        choice: typeof answer === "number" ? answer : answer ? 0 : 1,
      }),
    // Sets the clock, without a choice.
    skipTo: (tick: number): void => void (now = tick),
    state: (): DayState => state,
    // Walks to a spot and uses it.
    use(id: string): void {
      const spot = spotNamed(id);
      if (spot === undefined) throw new Error(`no spot named ${id}`);
      go(spot.x, spot.z);
      send("act");
    },
    // Goes home and sleeps.
    sleep(): void {
      const home = spotNamed(`home-${String(state.hero)}`);
      if (home === undefined) throw new Error("no home");
      go(home.x, home.z);
      send("act");
      send("pick", { choice: 0 });
    },
    wait: (ticks: number): void => void (now += ticks),
  };
}
