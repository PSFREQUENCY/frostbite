import { describe, expect, it } from "vitest";

import { dashArch, dashDesk, stages } from "../src/rules/course.ts";
import {
  clears,
  dashMax,
  dashPar,
  dashPrize,
  medalPrize,
  quizOf,
  quizPenalty,
  quizRight,
  ticketPrice,
  zuriTicks,
} from "../src/rules/dash.ts";
import { advance } from "../src/rules/day.ts";
import { degenRules } from "../src/rules/index.ts";
import { nodes } from "../src/rules/talk.ts";
import type { DayState } from "../src/rules/types.ts";
import { createBot } from "./support/bot.ts";
import { dashDay, runDash } from "./support/dash.ts";
import { refusal, started } from "./support/replay.ts";

// One input taken by the rules, or the test fails with their reason.
function step(
  state: DayState,
  type: string,
  data: Readonly<Record<string, number>> = {},
): DayState {
  const stepped = degenRules.step(state, {
    data: { ...data, tick: state.tick },
    type,
  });
  if (!stepped.ok) throw new Error(stepped.reason);
  return stepped.state;
}
const atArch = (day: number): DayState => ({
  ...started(3, 4, day),
  ...dashArch,
});
// A quiet stretch of avenue with no place in reach.
const quiet = { x: 18_000, z: 16_200 };

describe("the Degen Dash", () => {
  it("sells a ticket at Miss Mirinda's arch from the second day, and starts the clock with one, on foot", () => {
    expect(
      refusal({ ...started(3, 4, 1), ...dashArch }, "act", { tick: 0 }),
    ).toBe("nothing to do here");
    const asked = step(atArch(2), "act");
    expect(asked.talk).toBe("zuri");
    expect(step(asked, "pick", { choice: 1 }).tickets).toBe(0);
    const bought = step(asked, "pick", { choice: 0 });
    expect([bought.tickets, bought.pocket, bought.talk]).toEqual([
      1,
      asked.pocket - ticketPrice,
      null,
    ]);
    expect(
      refusal({ ...bought, talk: "zuri" }, "pick", { choice: 0, tick: 0 }),
    ).toBe("you have a ticket already");
    // A ride is left at the arch before the start.
    const parked = step({ ...bought, ride: "car" }, "act");
    expect([parked.ride, parked.dash, parked.tickets]).toEqual(["foot", 0, 1]);
    const off = step({ ...bought, tick: 900 }, "act");
    expect([off.dash, off.dashFrom, off.tickets]).toEqual([1, 900, 0]);
    expect(refusal(off, "act", { tick: 900 })).toBe(
      "the Dash is on: make for the next gate",
    );
    // The fourth morning starts with an empty pocket.
    const broke = step(atArch(4), "act");
    expect(refusal(broke, "pick", { choice: 0, tick: 0 })).toBe(
      "not enough DUN",
    );
  });

  it("clears each gate only in its reach and only the right way", () => {
    const day = started(3, 4, 2);
    const at = (index: number, more: Partial<DayState>): boolean => {
      const stage = stages[index];
      if (stage === undefined) throw new Error("no gate");
      return clears({ ...day, ...stage, ...more }, stage);
    };
    const cases: readonly [number, Partial<DayState>, Partial<DayState>][] = [
      [0, { gait: 1 }, { gait: 0 }],
      [1, { gait: 2 }, { gait: 1 }],
      [2, { gait: 3 }, { gait: 2 }],
      [3, { level: 3 }, { level: 2 }],
      [4, { level: 4 }, { level: 3 }],
      [5, { looking: true }, { looking: false }],
      [6, { ride: "car" }, { ride: "bike" }],
      [8, { ride: "van" }, { x: dashArch.x + 400 }],
    ];
    for (const [index, right, wrong] of cases) {
      expect(at(index, right), `gate ${String(index + 1)}`).toBe(true);
      expect(at(index, wrong), `gate ${String(index + 1)}`).toBe(false);
    }
    // Running past the first gate out of its reach, or on a scooter, clears nothing; the desk is answered, never walked through.
    expect(at(0, { gait: 1, z: (stages[0]?.z ?? 0) + 400 })).toBe(false);
    expect(at(0, { gait: 1, ride: "scooter" })).toBe(false);
    expect(at(7, {})).toBe(false);
  });

  it("asks today's question at the desk at the eighth gate, adds time for a wrong answer and moves on with the right one", () => {
    const desk = { ...started(3, 4, 2), ...dashDesk, dash: 3, dashFrom: 0 };
    expect(refusal(desk, "act", { tick: 0 })).toBe(
      "the desk asks at the eighth gate",
    );
    const asked = step({ ...desk, dash: 8 }, "act");
    const quiz = quizOf(asked);
    expect(asked.talk).toBe(`quiz-${String(quiz)}`);
    const right = quizRight[quiz] ?? 0;
    const missed = step(asked, "pick", { choice: (right + 1) % 3 });
    expect([missed.talk, missed.dashFrom, missed.dash]).toEqual([
      asked.talk,
      -quizPenalty,
      8,
    ]);
    const answered = step(missed, "pick", { choice: right });
    expect([answered.talk, answered.dash]).toEqual([null, 9]);
    // Every question has one right answer of three, and the rest ask again.
    quizRight.forEach((answer, index) => {
      const asks = nodes[`quiz-${String(index)}`] ?? [];
      expect(asks.map(({ does }) => does === "dash-right")).toEqual(
        [0, 1, 2].map((choice) => choice === answer),
      );
    });
    expect(
      refusal({ ...asked, dash: 0 }, "pick", { choice: right, tick: 0 }),
    ).toBe("the clock has run out");
  });

  it("pays the top prize once a day for a clean run under par, a medal otherwise, and closes the course after six minutes", () => {
    const won = dashDay().state();
    expect(won.done).toEqual(
      expect.arrayContaining(["dash-won", "dash-finished"]),
    );
    expect(won.dashTime).toBeLessThanOrEqual(dashPar);
    const start = started(3, 4, 2);
    expect(won.pocket).toBe(start.pocket - ticketPrice + dashPrize);
    // Again the same day, on the ticket the roof's gate earned (rooftop running mastered, `mastery.ts`): a win, and no second prize.
    expect([won.done.includes("mastered-rooftop-runner"), won.tickets]).toEqual(
      [true, 1],
    );
    const again = createBot(3, 4, 2);
    again.skipTo(300);
    runDash(again);
    const before = again.here().pocket;
    runDash(again);
    expect([again.here().pocket, again.here().tickets]).toEqual([before, 0]);
    // A third time, a ticket bought at the arch.
    runDash(again);
    expect(again.here().pocket).toBe(before - ticketPrice);
    const slow = dashDay(true).state();
    expect(slow.done).toContain("dash-finished");
    expect(slow.done).not.toContain("dash-won");
    expect(slow.dashTime).toBeGreaterThan(dashPar);
    expect(slow.pocket).toBe(start.pocket - ticketPrice + medalPrize);
    // Over the line under par: clean is a win and says so; with heat on it is a finish, not a win.
    const home = { ...start, ...dashArch, dash: 9, dashFrom: 100, tick: 200 };
    const clean = advance(home, 201);
    expect([clean.dash, clean.talk, clean.dashTime]).toEqual([
      0,
      "dash-won",
      101,
    ]);
    const hot = advance({ ...home, heat: 150 }, 201);
    expect([hot.dash, hot.talk, hot.done.includes("dash-won")]).toEqual([
      0,
      "dash-done",
      false,
    ]);
    const late = {
      ...start,
      dash: 4,
      dashFrom: 0,
      talk: "quiz-1",
      tick: dashMax,
    };
    const shut = advance(late, dashMax + 2);
    expect([shut.dash, shut.talk, shut.dashTime]).toEqual([0, "dash-out", 0]);
  });

  it("brings Miss Mirinda to a hero on foot in the street at her hours, with a ticket to sell, until they walk off", () => {
    const [first = 0, second = 0] = zuriTicks;
    const street = { ...started(3, 4, 2), ...quiet, tick: first - 1 };
    const met = advance(street, first);
    expect(met.zuri).toEqual(quiet);
    expect(met.done).toContain("zuri-1");
    const talked = step(met, "act");
    expect(talked.talk).toBe("zuri");
    expect(step(talked, "pick", { choice: 1 }).zuri).toBeNull();
    // Walked off, she goes; her next hour brings her back, once.
    const gone = advance({ ...met, x: quiet.x + 1_000 }, first + 1);
    expect(gone.zuri).toBeNull();
    const back = advance(gone, second);
    expect(back.zuri).toEqual({ x: quiet.x + 1_000, z: quiet.z });
    expect(advance({ ...back, zuri: null }, second + 5).zuri).toBeNull();
    // Not on the first morning, not to a hero with a ticket or on a ride.
    for (const busy of [
      { ...street, day: 1 },
      { ...street, tickets: 1 },
      { ...street, ride: "bike" as const },
    ])
      expect(advance(busy, first).zuri).toBeNull();
  });
});
