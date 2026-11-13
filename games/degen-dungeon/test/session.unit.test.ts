import { describe, expect, it } from "vitest";

import { maxTicks } from "../src/rules/constants.ts";
import { createRunSession } from "../src/session.ts";
import { replay } from "./support/replay.ts";

const walk = (
  session: ReturnType<typeof createRunSession>,
  dir: number,
  ticks: number,
): void => {
  session.send({ dir, type: "move" });
  for (let at = 0; at < ticks; at += 1) session.tick();
  session.send({ dir: -1, type: "move" });
};

describe("a day as it is played", () => {
  it("refuses settings the rules refuse", () => {
    expect(() => createRunSession({ day: 9, hero: 7, seed: 1 })).toThrow(
      "hero must be 0 to 9 and day 1 to 5",
    );
  });

  it("records only choices, tells of each milestone once, and its record replays to the same day", () => {
    const told: string[] = [];
    const session = createRunSession({
      day: 1,
      hero: 7,
      onEarned: (id) => told.push(id),
      seed: 4,
    });
    walk(session, 4, 193);
    expect(session.send({ dir: -1, type: "move" })).toEqual({ ok: true });
    walk(session, 8, 77);
    expect(session.send({ type: "act" })).toEqual({ ok: true });
    expect(session.send({ type: "act" })).toEqual({
      ok: false,
      reason: "answer first",
    });
    expect([
      session.clock(),
      session.state().pocket,
      told,
      session.earned(),
    ]).toEqual([270, 100, ["faucet"], ["faucet"]]);
    expect(session.state().talk).toBe("paper");
    const record = session.record();
    expect(record.inputs.map(({ type }) => type)).toEqual([
      "move",
      "move",
      "move",
      "move",
      "act",
      "end",
    ]);
    expect([record.claims, record.config]).toEqual([
      ["faucet"],
      { day: 1, hero: 7 },
    ]);
    expect(replay(record)).toEqual(session.state());
    expect(session.state().cause).toBe("closed");
    expect(session.record().inputs).toHaveLength(6);
    expect(session.send({ type: "act" })).toEqual({
      ok: false,
      reason: "the day has ended",
    });
    session.tick();
    expect(session.clock()).toBe(270);
  });

  it("needs no closing input when a choice ends the day, and writes one when the clock or a tux does", () => {
    const home = createRunSession({ day: 1, hero: 7, seed: 4 });
    home.send({ type: "act" });
    expect([home.state().cause, home.state().talk]).toEqual([null, "home"]);
    home.send({ choice: 0, type: "pick" });
    expect(home.state().cause).toBe("home");
    const stayed = home.record();
    expect(stayed.inputs.map(({ type }) => type)).toEqual(["act", "pick"]);
    expect(replay(stayed)).toEqual(home.state());

    const told: string[] = [];
    const late = createRunSession({
      day: 3,
      hero: 9,
      onEarned: (id) => told.push(id),
      seed: 5,
    });
    for (let at = 0; at <= maxTicks; at += 1) late.tick();
    expect([late.state().cause, late.clock()]).toEqual(["timeout", maxTicks]);
    const record = late.record();
    expect(record.inputs).toEqual([{ data: { tick: maxTicks }, type: "end" }]);
    expect(replay(record)).toEqual(late.state());
    expect(told).toEqual([]);
  });
});
