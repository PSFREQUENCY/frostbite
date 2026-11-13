import { describe, expect, it } from "vitest";

import { dayPockets, maxInputs, maxTicks } from "../src/rules/constants.ts";
import { advance } from "../src/rules/day.ts";
import { degenRules } from "../src/rules/index.ts";
import { refusal, started } from "./support/replay.ts";

describe("starting a day", () => {
  it("takes a hero and a story day, each in range, and nothing it does not know", () => {
    const short: Readonly<Record<string, number>>[] = [
      {},
      { day: 1 },
      { day: 1, hero: 1, more: 1 },
    ];
    for (const config of short)
      expect(degenRules.init(1, config)).toEqual({
        ok: false,
        reason: "a day takes a day and a hero, and may add loop, fate or boon",
      });
    const wrong: Readonly<Record<string, number | string>>[] = [
      { day: 0, hero: 1 },
      { day: 6, hero: 1 },
      { day: 1, hero: 10 },
      { day: 1.5, hero: 1 },
      { day: 1, hero: "7" },
    ];
    for (const config of wrong)
      expect(degenRules.init(1, config).ok).toBe(false);
    expect(degenRules.init(1, { day: 5, hero: 9 }).ok).toBe(true);
  });

  it("is the same for the same seed, wakes the hero at home with that day's pocket, and lets the seed decide today's scam", () => {
    expect(started(11, 7, 1)).toEqual(started(11, 7, 1));
    const day = started(11, 7, 3);
    expect([day.x, day.z, day.pocket, day.tick]).toEqual([
      18_000,
      15_500,
      dayPockets[2],
      0,
    ]);
    expect(started(11, 0, 1).x).toBe(6_000);
    const scams = new Set(
      [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => started(seed, 7, 1).crooked),
    );
    expect(scams.size).toBe(2);
    expect(degenRules.score?.(day)).toBeNull();
  });
});

describe("an input", () => {
  const day = started(3, 7, 1);

  it("is refused with a reason when it is not one the rules know or is badly made", () => {
    expect(refusal(day, "dance", { tick: 0 })).toBe("no such input: dance");
    expect(refusal(day, "move", { tick: 0 })).toBe(
      "the input takes exactly: dir, tick",
    );
    expect(refusal(day, "move", { dir: 16, tick: 0 })).toBe(
      "dir must be a heading from -1 to 15",
    );
    expect(refusal(day, "move", { dir: 1.5, tick: 0 })).toBe(
      "dir must be a heading from -1 to 15",
    );
    expect(refusal(day, "act", { tick: 0.5 })).toBe(
      "tick must be a whole number",
    );
    expect(refusal(day, "pick", { choice: 5, tick: 0 })).toBe(
      "choice must be 0 to 4",
    );
    expect(refusal(day, "pick", { choice: 2, tick: 0 })).toBe("yes or no");
    expect(refusal(day, "look", { tick: 0 })).toBeNull();
    expect(refusal(day, "pick", { choice: 0, tick: 0 })).toBe("nobody asked");
    expect(refusal(day, "lift", { by: 0, tick: 0 })).toBe("by must be 1 or -1");
    expect(refusal(day, "lift", { by: 2, tick: 0 })).toBe("by must be 1 or -1");
    expect(refusal(day, "lift", { by: 1, tick: 0 })).toBe(
      "only a helicopter climbs",
    );
    expect(refusal(day, "act", { tick: 0 })).toBeNull();
    expect(refusal(advance(day, 9), "act", { tick: 8 })).toBe(
      "tick 8 is already past",
    );
  });

  it("is refused once the record is full, though the day can still be closed", () => {
    const full = { ...day, inputs: maxInputs };
    expect(refusal(full, "move", { dir: 0, tick: 0 })).toBe(
      "the day's record is full",
    );
    expect(refusal(full, "end", { tick: 0 })).toBeNull();
  });

  it("cannot come after the day has ended, by itself or by a closing input", () => {
    expect(refusal(day, "move", { dir: 0, tick: maxTicks })).toBe(
      "the day ended before this",
    );
    const closed = degenRules.step(day, { data: { tick: 30 }, type: "end" });
    if (!closed.ok) throw new Error(closed.reason);
    expect([
      closed.state.cause,
      closed.state.tick,
      degenRules.score?.(closed.state),
    ]).toEqual(["closed", 30, 0]);
    expect(refusal(closed.state, "act", { tick: 31 })).toBe(
      "the day has ended",
    );
    const late = degenRules.step(day, {
      data: { tick: maxTicks },
      type: "end",
    });
    expect(late.ok && late.state.cause).toBe("timeout");
  });
});
