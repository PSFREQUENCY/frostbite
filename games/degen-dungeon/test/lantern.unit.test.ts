import { describe, expect, it } from "vitest";

import { afterDay, freshProgress, nextRun } from "../src/progress.ts";
import { boons, nightTick, visionTicks } from "../src/rules/constants.ts";
import { startDay } from "../src/rules/day.ts";
import { degenRules } from "../src/rules/index.ts";
import { spotNamed } from "../src/rules/places.ts";
import { nodes } from "../src/rules/talk.ts";
import { answers, wakeLine } from "../src/script/cast.ts";
import { talks } from "../src/script/lines.ts";
import { createRunSession } from "../src/session.ts";
import { nightDay } from "./support/night.ts";
import { refusal, replay, started } from "./support/replay.ts";

const ground = spotNamed("lanterns");
// The first seed whose morning answers a wish, and the first that does not.
const seedFor = (answer: boolean): number => {
  for (let seed = 1; seed < 200; seed += 1)
    if (startDay(seed, 7, 2, 0, 0, 1).answered > 0 === answer) return seed;
  throw new Error("no such seed");
};

describe("the lantern night", () => {
  it("opens the lantern ground only after dark, takes one wish a night, and keeps it on the day", () => {
    if (ground === undefined) throw new Error("no lantern ground");
    const there = { ...started(4, 7, 2), x: ground.x, z: ground.z };
    expect(
      refusal({ ...there, tick: nightTick - 1 }, "act", {
        tick: nightTick - 1,
      }),
    ).toBe("the lanterns go up after dark");
    const lit = degenRules.step(
      { ...there, tick: nightTick },
      {
        data: { tick: nightTick },
        type: "act",
      },
    );
    if (!lit.ok) throw new Error(lit.reason);
    expect(lit.state.talk).toBe("lantern");
    const declined = degenRules.step(lit.state, {
      data: { choice: 4, tick: nightTick },
      type: "pick",
    });
    expect(declined.ok && [declined.state.talk, declined.state.wish]).toEqual([
      null,
      0,
    ]);
    for (const wish of [1, 2, 3, 4]) {
      const day = nightDay(wish);
      expect([day.here().wish, day.here().cause]).toEqual([wish, "home"]);
      expect(day.here().done).toContain("lantern");
    }
    const again = {
      ...nightDay(2).state(),
      cause: null,
      ended: false,
      talk: "lantern",
    };
    expect(refusal(again, "pick", { choice: 0, tick: again.tick })).toBe(
      "your lantern is already up",
    );
    expect(talks.lantern?.answers.length).toBe(nodes.lantern?.length);
  });

  it("carries the wish to the next story day, where the seed decides whether the crypto gods answer it", () => {
    const yes = seedFor(true);
    const no = seedFor(false);
    const plain = startDay(yes, 7, 2);
    const gifts = [1, 2, 3, 4].map((boon) => startDay(yes, 7, 2, 0, 0, boon));
    expect(gifts.map(({ answered }) => answered)).toEqual([1, 2, 3, 4]);
    expect(gifts[0]?.vision).toBe(visionTicks + boons[1]);
    expect(gifts[1]?.rep).toBe(boons[2]);
    expect(gifts[2]?.freezer).toBe(plain.freezer + boons[3]);
    expect(gifts[3]?.pocket).toBe(plain.pocket + boons[4]);
    expect(gifts[3]?.peakPocket).toBe(plain.pocket + boons[4]);
    const unanswered = startDay(no, 7, 2, 0, 0, 4);
    expect([unanswered.answered, unanswered.pocket]).toEqual([
      0,
      startDay(no, 7, 2).pocket,
    ]);
    expect(startDay(yes, 7, 1, 1, 0, 4).answered).toBe(0);
    expect(wakeLine(7, 0, 2, 3)).toBe(answers[3]);
    expect(wakeLine(7, 0, 2, 0)).not.toBe(answers[3]);
  });

  it("takes a boon only as a wish from 1 to 4, and never on a trip back", () => {
    for (const boon of [0, 5, 1.5, "2"])
      expect(degenRules.init(1, { boon, day: 2, hero: 7 })).toEqual({
        ok: false,
        reason: "a boon is last night's wish, 1 to 4",
      });
    expect(degenRules.init(1, { boon: 2, day: 1, hero: 7, loop: 1 })).toEqual({
      ok: false,
      reason: "a trip back starts fresh, with no fate and no boon",
    });
    expect(degenRules.init(1, { boon: 2, day: 3, fate: -2, hero: 7 }).ok).toBe(
      true,
    );
  });

  it("is remembered by the page between days, and recorded with the day that carries it", () => {
    const night = nightDay(3).state();
    const after = afterDay(freshProgress, { ...night, day: 1 }).progress;
    expect(after.wish).toBe(3);
    expect(nextRun(after).boon).toBe(3);
    const trip = afterDay(after, { ...night, day: 1, loop: 1 }).progress;
    expect(trip.wish).toBe(0);
    const seed = seedFor(true);
    const session = createRunSession({ boon: 4, day: 2, hero: 7, seed });
    expect(session.state().answered).toBe(4);
    expect(session.send({ mode: 1, type: "gait" })).toEqual({ ok: true });
    expect(session.send({ dir: 0, type: "move" })).toEqual({ ok: true });
    for (let tick = 0; tick < 40; tick += 1) session.tick();
    const record = session.record();
    expect(record.config).toEqual({ boon: 4, day: 2, hero: 7 });
    expect(replay(record)).toEqual(session.state());
  });
});
