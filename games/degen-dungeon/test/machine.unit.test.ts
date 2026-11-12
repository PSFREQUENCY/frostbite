import { describe, expect, it } from "vitest";

import {
  echoTicks,
  fateDun,
  faucetDun,
  gigRep,
  loopPocket,
  paradoxHeat,
  reach,
  tipDun,
} from "../src/rules/constants.ts";
import { startDay } from "../src/rules/day.ts";
import { heroes } from "../src/rules/heroes.ts";
import { degenRules } from "../src/rules/index.ts";
import {
  echoAt,
  moments,
  recklessOn,
  risen,
  statue,
} from "../src/rules/machine.ts";
import type { DayState } from "../src/rules/types.ts";
import { onLand, spots } from "../src/rules/world.ts";
import { createRunSession } from "../src/session.ts";
import { createBot } from "./support/bot.ts";
import { refusal, replay } from "./support/replay.ts";
import { machineDay, tripDay } from "./support/trips.ts";

const seedWhere = (reckless: boolean): number => {
  for (let seed = 1; seed < 64; seed += 1)
    if (recklessOn({ loop: 1, seed }) === reckless) return seed;
  throw new Error("no such seed");
};
const now = (state: DayState): { tick: number } => ({ tick: state.tick });

describe("the Time Machine", () => {
  it("sleeps until the hero reaches the top, then takes whoever steps up to it", () => {
    const early = createBot(1, 7, 1);
    early.go(statue.x, statue.z);
    expect(risen(early.here())).toBe(false);
    expect(refusal(early.here(), "act", now(early.here()))).toBe(
      "the statue is asleep",
    );
    const top = machineDay();
    expect([top.state().cause, top.state().ended]).toEqual(["machine", true]);
    expect(risen(top.state())).toBe(true);
    expect(degenRules.earned(top.state())).toEqual([
      "storm-catch",
      "storm-funnel",
      "time-machine",
    ]);
    const record = { config: { day: 3, hero: 0 }, inputs: top.inputs, seed: 5 };
    expect(replay(record)).toEqual(top.state());
  });

  it("takes only a trip to day one, and lands the traveller beside the statue", () => {
    expect(degenRules.init(1, { day: 1, hero: 7, loop: 1 }).ok).toBe(true);
    for (const loop of [0, 10, 1.5])
      expect(degenRules.init(1, { day: 1, hero: 7, loop })).toMatchObject({
        ok: false,
        reason: "a trip back is loop 1 to 9, and always to day 1",
      });
    expect(degenRules.init(1, { day: 2, hero: 7, loop: 1 }).ok).toBe(false);
    const trip = startDay(1, 7, 1, 1);
    expect([trip.x, trip.z, trip.pocket, trip.loop, trip.fate]).toEqual([
      statue.x,
      statue.z,
      loopPocket,
      1,
      0,
    ]);
    expect(risen(trip)).toBe(true);
    expect(refusal(trip, "act", { tick: 0 })).toBe(
      "the machine is cooling down",
    );
  });

  it("keeps the newbie at home, then in the Faucet line, then at the scam, each clear of every other place", () => {
    expect(echoAt(startDay(1, 7, 1))).toBeNull();
    heroes.forEach((_, hero) => {
      const places = [0, echoTicks, 2 * echoTicks, 3 * echoTicks - 1].map(
        (tick) => echoAt({ hero, loop: 1, tick }),
      );
      expect(places.map((place) => place?.id)).toEqual([
        ...moments,
        "echo-offer",
      ]);
      for (const place of [statue, ...places]) {
        if (place === null) throw new Error("nobody there");
        expect(onLand(place.x, place.z)).toBe(true);
        for (const spot of spots)
          expect(
            Math.max(Math.abs(spot.x - place.x), Math.abs(spot.z - place.z)),
          ).toBeGreaterThan(2 * reach);
      }
    });
  });

  it("bends the timeline for the better with a tip to a careful newbie and a warning", () => {
    const kind = tripDay(seedWhere(false), 7, true);
    expect([kind.state().fate, kind.state().heat, kind.state().rep]).toEqual([
      5,
      0,
      5 * gigRep,
    ]);
    expect(kind.state().pocket).toBe(loopPocket - tipDun);
    expect(degenRules.earned(kind.state())).toEqual([
      "met-yourself",
      "brighter-timeline",
    ]);
    expect(refusal(kind.here(), "act", now(kind.here()))).toBe(
      "you two have talked already",
    );
    kind.end();
    expect(degenRules.score?.(kind.state())).toBe(5 * fateDun);
  });

  it("bends it for the worse with the same tip to a reckless one, a drained Faucet and a silence", () => {
    const spoiled = tripDay(seedWhere(true), 7, true);
    expect([spoiled.state().fate, spoiled.state().peak]).toEqual([
      1,
      2 * paradoxHeat,
    ]);
    expect(degenRules.earned(spoiled.state())).toEqual(["met-yourself"]);

    const asked = (talk: string, pocket = loopPocket): DayState => ({
      ...startDay(seedWhere(true), 7, 1, 1),
      pocket,
      talk,
    });
    const answer = (state: DayState, choice: number): DayState => {
      const data = { choice, tick: 0 };
      const stepped = degenRules.step(state, { data, type: "pick" });
      if (!stepped.ok) throw new Error(stepped.reason);
      return stepped.state;
    };
    const cut = answer(asked("echo-faucet"), 0);
    expect([cut.fate, cut.pocket, cut.heat]).toEqual([
      -2,
      loopPocket + faucetDun,
      2 * paradoxHeat,
    ]);
    const quiet = answer(asked("echo-offer"), 1);
    expect([quiet.fate, quiet.heat, quiet.done, quiet.talk]).toEqual([
      -1,
      paradoxHeat,
      ["echo-offer"],
      null,
    ]);
    expect(answer(asked("echo-wake"), 1).fate).toBe(1);
    expect(
      refusal(asked("echo-wake", tipDun - 1), "pick", { choice: 0, tick: 0 }),
    ).toBe("not enough DUN");
    expect(degenRules.score?.({ ...cut, ended: true, made: 300 })).toBe(0);
    expect(degenRules.score?.({ ...quiet, ended: true, made: 900 })).toBe(
      900 - fateDun,
    );
  });

  it("has nobody to meet at a place before the newbie gets there, and records a trip so that it replays", () => {
    const early = createBot(1, 7, 1, 1);
    early.go(18_000, 18_000);
    expect(refusal(early.here(), "act", now(early.here()))).toBe(
      "nothing to do here",
    );
    const session = createRunSession({ day: 1, hero: 7, loop: 1, seed: 9 });
    session.send({ dir: 8, type: "move" });
    for (let tick = 0; tick < 40; tick += 1) session.tick();
    const record = session.record();
    expect(record.config).toEqual({ day: 1, hero: 7, loop: 1 });
    expect(replay(record)).toEqual(session.state());
    expect(session.state().loop).toBe(1);
  });
});
