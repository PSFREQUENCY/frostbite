// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import { showTick, spiritPrice, stage } from "../src/rules/concert.ts";
import { openTo, spotNamed } from "../src/rules/places.ts";
import { venueAt } from "../src/rules/venues.ts";
import { talkOf } from "../src/page/words.ts";
import { sidesOf } from "../src/sides.ts";
import { danceHint } from "../src/script/concert.ts";
import { clipPose } from "../src/view/clips.ts";
import { buildConcert } from "../src/view/concert.ts";
import { createBot } from "./support/bot.ts";
import { refusal, started } from "./support/replay.ts";

type Bot = ReturnType<typeof createBot>;

// A landmark's doorway, from the street outside it.
function doorOf(id: string): { x: number; z: number; street: number } {
  const spot = spotNamed(id);
  const hall = spot === undefined ? null : venueAt(spot.x, spot.z);
  if (spot === undefined || hall === null || hall.door === null)
    throw new Error(`no ${id}`);
  const { door, out } = hall;
  return {
    street: out === 1 ? door.z1 + 100 : door.z0 - 100,
    x: (door.x0 + door.x1) / 2,
    z: spot.z,
  };
}
// Into a landmark's hall by its door, to a place on its floor, and act there; and back out to the street.
function walkIn(bot: Bot, id: string): void {
  const spot = spotNamed(id);
  const door = doorOf(id);
  bot.go(door.x, door.street);
  bot.leg("z", door.z);
  bot.leg("x", spot?.x ?? door.x);
  bot.act();
}
function walkOut(bot: Bot, id: string): void {
  const door = doorOf(id);
  bot.leg("x", door.x);
  bot.leg("z", door.street);
}

// Day two up to the show: a flyer, the gate, the stage door late in the day, a spirit625 from Omi Omy, and the drink handed over.
function concertDay(): Bot {
  const bot = createBot(5, 7, 2);
  // At a run: the Old Floe is a long way from The Exchange.
  bot.gait(1);
  bot.use("flyers");
  bot.pick(0);
  bot.use("concert-gate");
  bot.pick(0);
  bot.skipTo(showTick);
  bot.use("stage-door");
  bot.pick(0);
  walkIn(bot, "omi-omy");
  bot.pick(0);
  walkOut(bot, "omi-omy");
  bot.use("stage-door");
  bot.pick(0);
  return bot;
}

describe("day two's concert", () => {
  it("opens the flyer crew, the gate and the stage door on day two only, and Omi Omy and the dance on any day", () => {
    const one = started(1, 7, 1);
    const two = started(1, 7, 2);
    for (const id of ["flyers", "concert-gate", "stage-door"]) {
      const spot = spotNamed(id);
      expect([spot && openTo(spot, one), spot && openTo(spot, two)]).toEqual([
        false,
        true,
      ]);
    }
    for (const id of ["omi-omy", "partner"]) {
      const spot = spotNamed(id);
      expect(spot && openTo(spot, one)).toBe(true);
    }
  });

  it("lets a flyer through the gate, opens the stage door late in the day, and puts the show on for a spirit625", () => {
    const early = createBot(5, 7, 2);
    early.use("concert-gate");
    expect(
      refusal(early.state(), "pick", { choice: 0, tick: early.state().tick }),
    ).toBe(
      "the flyer is your pass: the crew on The Exchange's street has them",
    );
    const at = spotNamed("stage-door");
    const door = { ...started(5, 7, 2), x: at?.x ?? 0, z: at?.z ?? 0 };
    expect(refusal(door, "act", { tick: 0 })).toBe(
      "the stage door opens late in the day",
    );
    expect(
      refusal({ ...door, tick: showTick }, "act", { tick: showTick }),
    ).toBe("come in through the stadium gate first");
    const bot = concertDay();
    const day = bot.state();
    expect(day.done).toEqual(
      expect.arrayContaining(["flyer", "gate-in", "spirit625", "concert-show"]),
    );
    expect(sidesOf(day)[4]?.done).toBe(true);
    // A second spirit625 waits for after the show.
    const thirsty = { ...started(5, 7, 2), done: ["spirit625"], pocket: 100 };
    expect(
      refusal({ ...thirsty, talk: "omi-omy" }, "pick", { choice: 0, tick: 0 }),
    ).toBe("you have one already");
    expect(
      refusal(
        { ...thirsty, pocket: spiritPrice - 1, done: [], talk: "omi-omy" },
        "pick",
        {
          choice: 0,
          tick: 0,
        },
      ),
    ).toBe("not enough DUN");
  });

  it("has Miss Mirinda dance at The Long Game: a wrong move starts again, three right ones impress her, and Lux's show gives the hint", () => {
    const bot = createBot(5, 7, 2);
    walkIn(bot, "partner");
    expect(talkOf(bot.state())?.say).not.toContain(danceHint);
    bot.pick(1);
    expect(bot.state().talk).toBe("partner-again");
    bot.pick(0);
    for (const move of [0, 1, 2]) bot.pick(move);
    expect(bot.state().done).toContain("danced-mirinda");
    expect(sidesOf(bot.state())[5]?.done).toBe(true);
    bot.act();
    expect(bot.state().talk).toBe("partner-done");
    const seen = {
      ...started(5, 7, 2),
      done: ["concert-show"],
      talk: "partner-0",
    };
    expect(talkOf(seen)?.say).toContain(danceHint);
  });

  it("puts Lux and her band on stage late on day two, dancing through the thirty-second show, with the camera cutting round the stage", () => {
    const concert = buildConcert();
    const lux = concert.root.getObjectByName("lux");
    const day = { ...started(1, 7, 2), tick: showTick };
    concert.show({ ...started(1, 7, 1) }, 1);
    expect(lux?.parent?.visible).toBe(false);
    concert.show(day, 2);
    expect(lux?.parent?.visible).toBe(true);
    concert.show({ ...day, done: ["concert-show"] }, 3);
    concert.show({ ...day, done: ["concert-show"] }, 3.4);
    expect(lux?.rotation.y).not.toBe(0);
    concert.show(null, 4);
    expect(concert.root.visible).toBe(false);
    const pose = clipPose("show", { heading: 0, x: 0, y: 0, z: 0 }, 0.2);
    expect(Math.abs(pose.look[0] - stage.x / 100)).toBeLessThan(3);
    expect(clipPose("show", { heading: 0, x: 0, y: 0, z: 0 }, 1).fov).toBe(50);
  });
});
