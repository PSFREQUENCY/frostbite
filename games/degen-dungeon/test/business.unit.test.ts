import { describe, expect, it } from "vitest";

import { goalFor, talkOf } from "../src/page/words.ts";
import { cluesOf, questAt } from "../src/quest.ts";
import {
  inPark,
  lineAlong,
  lineLift,
  lineTicks,
  nextStop,
  skateTicks,
  stopAt,
  tillCap,
  tillOf,
} from "../src/rules/business.ts";
import { nightTick, ticksPerSecond } from "../src/rules/constants.ts";
import { advance } from "../src/rules/day.ts";
import { degenRules } from "../src/rules/index.ts";
import { rents } from "../src/rules/lofts.ts";
import { spotNamed } from "../src/rules/places.ts";
import { roomAt } from "../src/rules/rooms.ts";
import type { DayState } from "../src/rules/types.ts";
import { venues } from "../src/rules/venues.ts";
import { boroughs } from "../src/rules/world.ts";
import { lineLine, skateLine, tillLine } from "../src/script/lofts.ts";
import { refusal, started } from "./support/replay.ts";

const step = (
  day: DayState,
  type: string,
  more: Readonly<Record<string, number>> = {},
): DayState => {
  const stepped = degenRules.step(day, {
    data: { ...more, tick: day.tick },
    type,
  });
  if (!stepped.ok) throw new Error(stepped.reason);
  return stepped.state;
};
const at = (day: DayState, id: string): DayState => {
  const spot = spotNamed(id);
  return { ...day, x: spot?.x ?? 0, z: spot?.z ?? 0 };
};

describe("the hero's own shop", () => {
  it("sells a DUN a second on day one and a DUN more each day after, up to a full till", () => {
    const one = started(1, 7, 1);
    expect(tillOf({ ...one, tick: 60 * ticksPerSecond })).toBe(60);
    expect(tillOf({ ...started(1, 7, 3), tick: 60 * ticksPerSecond })).toBe(
      180,
    );
    expect(tillOf({ ...one, day: 6, tick: 17_999 })).toBe(tillCap);
    expect(tillOf({ ...one, tick: 900, tillAt: 900 })).toBe(0);
  });

  it("is emptied at the laptop in the hero's loft, which is theirs alone", () => {
    const laptop = spotNamed("till-7");
    expect([
      laptop?.only,
      roomAt(laptop?.x ?? 0, laptop?.z ?? 0)?.kind,
    ]).toEqual([7, "loft"]);
    const morning = { ...at(started(1, 7, 2), "till-7"), tick: 3_000 };
    const open = step(morning, "act");
    expect(open.talk).toBe("till");
    expect(talkOf(open)?.answers[0]).toBe("Empty the till: 200 DUN");
    const paid = step(open, "pick", { choice: 0 });
    expect([
      paid.pocket - open.pocket,
      paid.made - open.made,
      paid.tillAt,
      paid.done.includes("till"),
      paid.talk,
    ]).toEqual([200, 200, 3_000, true, "till"]);
    expect(refusal(paid, "pick", { choice: 0, tick: paid.tick })).toBe(
      "nothing has sold yet: give it a minute",
    );
    // Another hero's laptop is not there for this one.
    expect(
      refusal({ ...at(morning, "till-3") }, "act", { tick: morning.tick }),
    ).not.toBeNull();
  });

  it("sends a hero short of the rent to the laptop first, then to the landlord", () => {
    const short = { ...started(1, 7, 2), pocket: 0, tick: nightTick - 100 };
    expect(questAt(short)).toBe(spotNamed("till-7"));
    expect(goalFor({ ...short, done: ["riot", "speech"] })).toBe(tillLine);
    expect(questAt({ ...short, pocket: rents[1] })).toBe(
      spotNamed("landlord-7"),
    );
    expect(questAt({ ...short, tillAt: short.tick })).toBe(
      spotNamed("landlord-7"),
    );
  });
});

describe("the Green Line Express", () => {
  it("goes round the loop of boroughs, one stop to the next", () => {
    expect([nextStop(0), nextStop(3), nextStop(4)]).toEqual([1, 0, 0]);
    expect(stopAt(1)).toEqual({
      x: spotNamed("stop-1")?.x,
      z: spotNamed("stop-1")?.z,
    });
  });

  it("takes the lift up, runs along the rails and comes down at the next stop, and counts the ride", () => {
    const boarded = step(at(started(1, 7, 2), "stop-0"), "act");
    const from = boarded.tick;
    expect(boarded.line).toEqual({
      at: from,
      from: stopAt(0),
      to: 1,
    });
    expect(goalFor(boarded)).toBe(lineLine(boroughs[1] ?? ""));
    // Aboard, nothing else is done and the hero does not walk.
    expect(refusal(boarded, "act", { tick: from })).toBe(
      "you are on the train",
    );
    expect(refusal(boarded, "power", { tick: from })).toBe(
      "your power needs your own feet on the ground",
    );
    const moving = step(boarded, "move", { dir: 0 });
    const lifted = advance(moving, from + lineLift);
    expect([lifted.x, lifted.z]).toEqual([stopAt(0).x, stopAt(0).z]);
    const half = advance(moving, from + lineTicks / 2);
    expect(lineAlong(half.line, half.tick)).toBe(0.5);
    expect(half.x).toBe((stopAt(0).x + stopAt(1).x) / 2);
    const there = advance(moving, from + lineTicks);
    expect([there.x, there.z, there.line, there.rides]).toEqual([
      stopAt(1).x,
      stopAt(1).z,
      null,
      boarded.rides + 1,
    ]);
    expect(lineAlong(null, 0)).toBe(0);
  });

  it("takes people, not rides, and no chaser reaches a hero aboard", () => {
    const riding = {
      ...at(started(1, 7, 2), "stop-0"),
      ride: "scooter" as const,
    };
    expect(refusal(riding, "act", { tick: riding.tick })).toBe(
      "the train takes people, not rides",
    );
    const wanted = step(
      at({ ...started(1, 7, 2), heat: 400 }, "stop-0"),
      "act",
    );
    expect(advance(wanted, wanted.tick + 30).cop).toBeNull();
  });
});

describe("the skate park", () => {
  const park = venues.find(({ kind }) => kind === "skate");
  const middle = park?.middle ?? { x: 0, z: 0 };
  const rink = at(started(1, 7, 2), "venue-5-2");

  it("hands the hero a board, and five seconds rolling round the park on it is the day's skate", () => {
    const open = step(rink, "act");
    expect([open.talk, talkOf(open)?.answers[0]]).toEqual([
      "do-skate",
      "Grab a board",
    ]);
    const board = step(open, "pick", { choice: 0 });
    expect([board.ride, board.talk]).toEqual(["board", null]);
    expect(goalFor(board)).toBe(skateLine(skateTicks / ticksPerSecond));
    // Standing on it does not count; rolling east across the park does.
    expect(advance(board, board.tick + 60).skated).toBe(0);
    const rolling = step({ ...board, x: (park?.lot.x0 ?? 0) + 200 }, "move", {
      dir: 0,
    });
    const half = advance(rolling, rolling.tick + 60);
    expect([half.skated, half.done.includes("did-skate")]).toEqual([60, false]);
    const done = advance(rolling, rolling.tick + skateTicks);
    expect([done.done.includes("did-skate"), done.rep - board.rep]).toEqual([
      true,
      6,
    ]);
    expect(why(done, "do-skate")).toBe("you have skated today");
  });

  it("counts only skating inside the park, and a board is taken on foot", () => {
    expect(inPark(middle.x, middle.z)).toBe(true);
    expect(inPark(0, 0)).toBe(false);
    const away = { ...rink, ride: "board" as const, x: 18_000, z: 18_000 };
    expect(advance(step(away, "move", { dir: 0 }), away.tick + 30).skated).toBe(
      0,
    );
    expect(why({ ...rink, ride: "board" }, "do-skate")).toBe(
      "you are on a board",
    );
    expect(why({ ...rink, ride: "scooter" }, "do-skate")).toBe(
      "leave the ride you are on first",
    );
  });
});

const why = (day: DayState, talk: string): string | null =>
  refusal({ ...day, talk }, "pick", { choice: 0, tick: day.tick });

describe("the chase and the clues", () => {
  it("points the beacon at the purse snatcher while he runs", () => {
    const chase = { ...started(1, 7, 1), thief: { x: 22_000, z: 17_600 } };
    expect(questAt(chase)).toEqual({ x: 22_000, z: 17_600 });
  });

  it("lists the saucers' gifts from the mania on, and the magnet and the vacuum until they are picked up", () => {
    const kinds = (day: DayState): readonly string[] =>
      cluesOf(day).map(({ kind }) => kind);
    expect(kinds(started(1, 7, 1))).toEqual(["magnet", "vacuum"]);
    const mania = started(1, 7, 3);
    expect(kinds(mania)).toEqual(["glow", "pizza", "magnet", "vacuum"]);
    expect(
      kinds({ ...mania, done: ["item-glow", "item-pizza"], tools: 3 }),
    ).toEqual([]);
    expect(kinds({ ...mania, loop: 1, tools: 1 })).toEqual(["vacuum"]);
  });
});
