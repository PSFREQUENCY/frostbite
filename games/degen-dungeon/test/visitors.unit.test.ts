import { describe, expect, it } from "vitest";

import { afterDay, freshProgress, nextRun } from "../src/progress.ts";
import { degenRules } from "../src/rules/index.ts";
import {
  beamWait,
  beams,
  beamupsToday,
  invading,
  invasionTick,
  saucerOpen,
  visiting,
} from "../src/rules/invasion.ts";
import { openTo, spotNamed, spots } from "../src/rules/places.ts";
import { inSky, saucerPad } from "../src/rules/world.ts";
import { createBot } from "./support/bot.ts";
import { started } from "./support/replay.ts";
import { saucerPilotDay } from "./support/sky.ts";

type Bot = ReturnType<typeof createBot>;
const counter = (kind: string): string =>
  spots.find((spot) => spot.kind === "talk" && spot.node === `shop-${kind}`)
    ?.id ?? "";
// Glow sticks and a pizza, the visitors' favourite gifts.
const gifts = (bot: Bot): void => {
  for (const kind of ["hardware", "pizza"]) {
    bot.use(counter(kind));
    bot.pick(0);
    bot.pick(1);
  }
};
const stand = (bot: Bot, index: number): void => {
  const beam = beams[index] ?? { x: 0, z: 0 };
  bot.go(beam.x, beam.z);
  bot.wait(beamWait + 2);
};

describe("the visitors", () => {
  it("make each saucer a visit of its own on the mania's day: the first peace ends the alarm, and the rest stay as visitors", () => {
    const bot = createBot(3, 7, 3);
    gifts(bot);
    bot.skipTo(invasionTick);
    expect([invading(bot.here()), visiting(bot.here())]).toEqual([true, true]);
    stand(bot, 0);
    expect(bot.here().talk).toBe("abduction");
    bot.pick(0);
    const after = bot.here();
    expect([invading(after), visiting(after), beamupsToday(after)]).toEqual([
      false,
      true,
      1,
    ]);
    stand(bot, 1);
    expect(bot.here().talk).toBe("visit");
    bot.pick(0);
    // A saucer already visited today has flown home, and its beam with it.
    stand(bot, 0);
    expect([bot.here().talk, beamupsToday(bot.here())]).toEqual([null, 2]);
    expect(bot.here().done.filter((id) => id === "contact")).toHaveLength(1);
    expect(bot.here().rep).toBe(125);
  });

  it("come back as friends on later days: nothing to offer is no harm, and the third answer just sets the hero down", () => {
    const empty = createBot(4, 7, 5);
    empty.skipTo(invasionTick);
    expect([invading(empty.here()), visiting(empty.here())]).toEqual([
      false,
      true,
    ]);
    stand(empty, 0);
    expect([empty.here().talk, empty.here().ended]).toEqual([null, false]);
    const bot = createBot(4, 7, 5);
    gifts(bot);
    if (bot.here().tick < invasionTick) bot.skipTo(invasionTick);
    stand(bot, 0);
    expect(bot.here().talk).toBe("visit");
    bot.pick(2);
    expect([bot.here().talk, beamupsToday(bot.here())]).toEqual([null, 0]);
    bot.wait(beamWait + 2);
    bot.pick(0);
    expect(beamupsToday(bot.here())).toBe(1);
    // Not before their hour, and never on the first two days or a trip back.
    expect(visiting(started(4, 7, 5))).toBe(false);
    expect(visiting({ ...started(4, 7, 2), tick: invasionTick })).toBe(false);
    expect(visiting({ ...started(4, 7, 1), loop: 1, tick: invasionTick })).toBe(
      false,
    );
  });

  it("leave the hero a saucer of their own at thirteen beam-ups, to fly over the city and land on a street", () => {
    const day = started(1, 7, 2);
    const saucer = spotNamed("ride-saucer");
    if (saucer === undefined) throw new Error("no saucer");
    expect([saucer.x, saucer.z]).toEqual([saucerPad.x, saucerPad.z]);
    const early = { ...day, beamups: 12 };
    expect([saucerOpen(early), openTo(saucer, early)]).toEqual([false, false]);
    const thirteenth = { ...early, done: ["beamup-3"] };
    expect([saucerOpen(thirteenth), openTo(saucer, thirteenth)]).toEqual([
      true,
      true,
    ]);
    const bot = saucerPilotDay();
    const end = bot.here();
    expect([end.ride, end.level, end.done.includes("saucer")]).toEqual([
      "foot",
      0,
      true,
    ]);
    expect(inSky(saucerPad.x, saucerPad.z)).toBe(true);
    const config = { beamups: 13, day: 2, hero: 7 };
    const again = degenRules.init(6, config);
    expect(again.ok).toBe(true);
    expect(degenRules.init(6, { ...config, beamups: 100 })).toEqual({
      ok: false,
      reason: "beamups are 1 to 99",
    });
  });

  it("are counted in the save over the days, and carried into each next run", () => {
    const day = {
      ...started(1, 7, 5),
      cause: "home" as const,
      done: ["beamup-0", "beamup-2"],
    };
    const progress = afterDay({ ...freshProgress, beamups: 9 }, day).progress;
    expect(progress.beamups).toBe(11);
    expect(nextRun(progress).beamups).toBe(11);
    expect(
      afterDay({ ...freshProgress, beamups: 98 }, day).progress.beamups,
    ).toBe(99);
  });
});
