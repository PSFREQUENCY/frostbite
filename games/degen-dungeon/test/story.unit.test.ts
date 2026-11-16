import { describe, expect, it } from "vitest";

import { maxTicks, vestGap } from "../src/rules/constants.ts";
import { advance } from "../src/rules/day.ts";
import { heroes } from "../src/rules/heroes.ts";
import { degenRules } from "../src/rules/index.ts";
import { lastDay, moonNight } from "../src/rules/calendar.ts";
import {
  beatOf,
  chapterOf,
  questOf,
  questsOn,
  storyTold,
  tunnelMouth,
} from "../src/rules/story.ts";
import type { DayState } from "../src/rules/types.ts";
import { onLand } from "../src/rules/world.ts";
import { dreams } from "../src/script/dreams.ts";
import { stories } from "../src/script/stories.ts";
import { createBot } from "./support/bot.ts";
import { refusal, replay, started } from "./support/replay.ts";
import { tellStory } from "./support/story.ts";

const at = (day: DayState) => ({ tick: day.tick });
const beside = (day: DayState): DayState => {
  const beat = beatOf(day);
  if (beat === null) throw new Error("no beat");
  return { ...day, ...beat.at };
};

describe("the story", () => {
  it("has two quests on the first morning and three every day after it, words for every beat of every hero, and a dream with two endings for each", () => {
    for (let day = 1; day <= lastDay; day += 1)
      expect(questsOn(day), `day ${String(day)}`).toHaveLength(
        day === 1 ? 2 : 3,
      );
    expect(questsOn(lastDay + 1)).toEqual([]);
    heroes.forEach((_, hero) => {
      for (const day of [3, 4, 5])
        chapterOf(hero, day).forEach((beat, index) => {
          const words = stories[hero]?.[day - 3]?.[index];
          expect(words?.line.length ?? 0).toBeGreaterThan(10);
          expect(words?.answers?.length ?? 0).toBe(beat.pick?.length ?? 0);
        });
      expect(dreams[hero]?.endings).toHaveLength(2);
      expect(chapterOf(hero, moonNight)).toHaveLength(2);
      expect(chapterOf(hero, lastDay)).toHaveLength(1);
      for (const beat of [
        ...chapterOf(hero, moonNight),
        ...chapterOf(hero, lastDay),
      ])
        expect(onLand(beat.at.x, beat.at.z)).toBe(true);
    });
    expect([
      chapterOf(0, 1),
      chapterOf(0, 2),
      chapterOf(12, moonNight),
    ]).toEqual([[], [], []]);
  });

  it("can be told in full by every hero on every day, inside the day, and each telling replays", () => {
    heroes.forEach((_, hero) => {
      for (let day = 1; day <= lastDay; day += 1) {
        const bot = tellStory(createBot(20 + hero, hero, day));
        const end = bot.here();
        expect(end.tick, `${String(hero)} on day ${String(day)}`).toBeLessThan(
          maxTicks,
        );
        expect(storyTold(end), `${String(hero)} on day ${String(day)}`).toBe(
          true,
        );
        if (day === moonNight) expect(end.dream).toBe(2);
        if (day === lastDay)
          expect([end.cause, end.gate]).toEqual(["beach", 1]);
        const config = { day, hero };
        expect(replay({ config, inputs: bot.inputs, seed: 20 + hero })).toEqual(
          bot.state(),
        );
      }
    });
  });

  it("runs the first two days as quests read from the day: the speech and the paper, then a gig, a ride and a trade", () => {
    const bot = createBot(1, 0, 1);
    expect(questOf(bot.here())).toBe("speech");
    bot.go(18_000, 17_000);
    expect([questOf(bot.here()), bot.here().heat > 0]).toEqual([
      "speech",
      true,
    ]);
    bot.use("frost");
    for (let line = 0; line < 3; line += 1) bot.pick(0);
    expect(questOf(bot.state())).toBe("paper");
    bot.use("faucet");
    bot.pick(2);
    expect([questOf(bot.state()), bot.state().paper]).toEqual([null, 3]);
    expect(storyTold(bot.state())).toBe(true);
    const second = createBot(1, 0, 2);
    expect(questOf(second.here())).toBe("gig");
    second.use("gig-exchange");
    second.use("drop-marina");
    expect(questOf(second.state())).toBe("ride");
    second.use("stop-7");
    expect(questOf(second.state())).toBe("trade");
    second.use("chart");
    second.pick(0);
    expect([questOf(second.state()), storyTold(second.state())]).toEqual([
      null,
      true,
    ]);
    // Done out of order, the quest shown is the first still to do; and a trip back has none.
    expect(questOf({ ...started(1, 0, 2), bag: 5 })).toBe("gig");
    expect(questOf({ ...started(1, 0, 1), loop: 1 })).toBeNull();
    expect(storyTold({ ...started(1, 0, 1), loop: 1 })).toBe(false);
    const sneak = createBot(1, 6, 1);
    sneak.go(18_000, 17_000);
    expect([sneak.here().done, sneak.here().heat]).toEqual([["riot"], 0]);
  });

  it("asks for a lantern after dark on Moon Night, and a crew of two before the last door", () => {
    const night = { ...started(1, 4, moonNight), beat: 2 };
    expect(questOf(night)).toBe("lantern");
    expect(questOf({ ...night, done: ["lantern"] })).toBeNull();
    const last = started(1, 4, lastDay);
    expect(questOf(last)).toBe("crew");
    expect(questOf({ ...last, crew: [5, 3] })).toBe("beat-0");
    expect(questOf({ ...last, beat: 1, crew: [5, 3], gate: 1 })).toBe("beach");
  });

  it("refuses a beat until its need is met, and says which", () => {
    const needs: readonly [number, number, number, string][] = [
      [0, 4, 0, "this needs the right crewmate"],
      [2, 3, 1, "only frost vision shows it"],
      [0, 3, 2, "not enough DUN"],
      [5, 3, 0, "finish more gigs first"],
      [2, 4, 1, "ride the Green Line first"],
      [7, 3, 2, "trade on the Exchange floor first"],
      [5, 5, 1, "this needs a full crew"],
      [6, 5, 2, "lose the heat first"],
      [7, 7, 0, "this needs a full crew"],
    ];
    for (const [hero, day, beat, reason] of needs) {
      const there = beside({
        ...started(1, hero, day),
        beat,
        heat: reason.includes("heat") ? 400 : 0,
        pocket: reason.includes("DUN") ? 0 : 5_000,
      });
      expect(
        refusal(there, "act", at(there)),
        `${String(hero)} ${String(day)}`,
      ).toBe(reason);
    }
    const there = beside(started(1, 0, 3));
    expect(refusal({ ...there, x: there.x + 400 }, "act", at(there))).toBe(
      "nothing to do here",
    );
  });

  it("gives each of a beat's two answers its own gift, and on Moon Night the first answer is the dream", () => {
    const asked = beside({ ...started(1, 3, 5), beat: 1 });
    const open = degenRules.step(asked, { data: { tick: 0 }, type: "act" });
    if (!open.ok) throw new Error(open.reason);
    expect(open.state.talk).toBe("beat");
    const pick = (choice: number): DayState => {
      const done = degenRules.step(open.state, {
        data: { choice, tick: 0 },
        type: "pick",
      });
      if (!done.ok) throw new Error(done.reason);
      return done.state;
    };
    expect([pick(0).rep, pick(0).heat, pick(0).beat]).toEqual([40, 0, 2]);
    expect([pick(1).pocket - asked.pocket, pick(1).heat, pick(1).talk]).toEqual(
      [1_000, 100, null],
    );
    expect(refusal(open.state, "pick", { choice: 3, tick: 0 })).toBe(
      "pick one of the two",
    );
    const dream = createBot(3, 1, moonNight);
    const beat = beatOf(dream.here());
    if (beat === null) throw new Error("no dream");
    dream.go(beat.at.x, beat.at.z);
    dream.act();
    dream.pick(0);
    expect([dream.state().dream, dream.state().beat]).toEqual([1, 1]);
  });

  it("opens the oldest tunnel behind the last door, with the Vests behind, and they take the beach from anyone who dawdles", () => {
    const bot = createBot(5, 4, lastDay);
    tellStory(bot, 0);
    const end = bot.here();
    expect([end.cause, end.gate]).toEqual(["beach", 1]);
    const door = createBot(5, 4, lastDay);
    for (const id of ["recruit-5", "recruit-3"]) {
      door.use(id);
      door.pick(true);
    }
    const shut = {
      ...door.here(),
      x: tunnelMouth.x,
      z: tunnelMouth.z,
      dir: 12,
    };
    expect(advance(shut, shut.tick + 30).z).toBe(shut.z);
    const opened = {
      ...shut,
      gate: 1,
      vests: { x: tunnelMouth.x, z: tunnelMouth.z + vestGap },
    };
    expect(advance(opened, opened.tick + 30).z).toBeLessThan(shut.z);
    const late = advance({ ...opened, dir: -1 }, opened.tick + 600);
    expect([late.cause, late.ended]).toEqual(["vested", true]);
  });
});
