import { describe, expect, it } from "vitest";

import { maxTicks, vestGap } from "../src/rules/constants.ts";
import { advance } from "../src/rules/day.ts";
import { heroes } from "../src/rules/heroes.ts";
import { degenRules } from "../src/rules/index.ts";
import {
  beatOf,
  chapterDone,
  chapterOf,
  dayOneGoal,
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
  it("has words for every beat of every hero, and a dream with two endings for each", () => {
    heroes.forEach((_, hero) => {
      for (const day of [2, 3, 4])
        chapterOf(hero, day).forEach((beat, index) => {
          const words = stories[hero]?.[day - 2]?.[index];
          expect(words?.line.length ?? 0).toBeGreaterThan(10);
          expect(words?.answers?.length ?? 0).toBe(beat.pick?.length ?? 0);
        });
      expect(dreams[hero]?.endings).toHaveLength(2);
      expect(chapterOf(hero, 5)).toHaveLength(3);
      for (const beat of chapterOf(hero, 5))
        expect(onLand(beat.at.x, beat.at.z)).toBe(true);
    });
    expect(chapterOf(0, 1)).toEqual([]);
  });

  it("can be told in full by every hero on every day, inside the day, and each telling replays", () => {
    heroes.forEach((_, hero) => {
      for (const day of [2, 3, 4, 5]) {
        const bot = tellStory(createBot(20 + hero, hero, day));
        const end = bot.here();
        expect(end.tick, `${String(hero)} on day ${String(day)}`).toBeLessThan(
          maxTicks,
        );
        if (day < 5) expect(chapterDone(end)).toBe(true);
        else expect([end.cause, end.dream, end.gate]).toEqual(["beach", 2, 1]);
        const config = { day, hero };
        expect(replay({ config, inputs: bot.inputs, seed: 20 + hero })).toEqual(
          bot.state(),
        );
      }
    });
  });

  it("runs the first morning as goals: the riot, the speech, the paper, a gig, then home", () => {
    const bot = createBot(1, 0, 1);
    expect(dayOneGoal(bot.here())).toBe("riot");
    bot.go(18_000, 17_000);
    expect([dayOneGoal(bot.here()), bot.here().heat > 0]).toEqual([
      "speech",
      true,
    ]);
    bot.use("frost");
    for (let line = 0; line < 3; line += 1) bot.pick(0);
    expect(dayOneGoal(bot.state())).toBe("paper");
    bot.use("faucet");
    bot.pick(2);
    expect([dayOneGoal(bot.state()), bot.state().paper]).toEqual(["gig", 3]);
    bot.use("gig-exchange");
    bot.use("drop-marina");
    expect(dayOneGoal(bot.state())).toBe("home");
    bot.sleep();
    expect(dayOneGoal(bot.state())).toBeNull();
    expect(dayOneGoal(started(1, 0, 2))).toBeNull();
    const sneak = createBot(1, 6, 1);
    sneak.go(18_000, 17_000);
    expect([sneak.here().done, sneak.here().heat]).toEqual([["riot"], 0]);
  });

  it("refuses a beat until its need is met, and says which", () => {
    const needs: readonly [number, number, number, string][] = [
      [0, 3, 0, "this needs the right crewmate"],
      [2, 2, 1, "only frost vision shows it"],
      [0, 2, 2, "not enough DUN"],
      [5, 2, 0, "finish more gigs first"],
      [2, 3, 1, "ride the Green Line first"],
      [7, 2, 2, "trade on the Exchange floor first"],
      [5, 4, 1, "this needs a full crew"],
      [6, 4, 2, "lose the heat first"],
      [7, 5, 2, "this needs a full crew"],
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
    const there = beside(started(1, 0, 2));
    expect(refusal({ ...there, x: there.x + 400 }, "act", at(there))).toBe(
      "nothing to do here",
    );
  });

  it("gives each of a beat's two answers its own gift, and on the last day the first answer is the dream", () => {
    const asked = beside({ ...started(1, 3, 4), beat: 1 });
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
    const dream = createBot(3, 1, 5);
    const beat = beatOf(dream.here());
    if (beat === null) throw new Error("no dream");
    dream.go(beat.at.x, beat.at.z);
    dream.act();
    dream.pick(0);
    expect([dream.state().dream, dream.state().beat]).toEqual([1, 1]);
  });

  it("opens the oldest tunnel behind the last door, with the Vests behind, and they take the beach from anyone who dawdles", () => {
    const bot = createBot(5, 4, 5);
    tellStory(bot, 0);
    const end = bot.here();
    expect([end.cause, end.dream]).toEqual(["beach", 1]);
    const door = createBot(5, 4, 5);
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
