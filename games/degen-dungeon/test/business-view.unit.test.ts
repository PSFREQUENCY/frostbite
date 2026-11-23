import { describe, expect, it } from "vitest";

import { lineLift, lineTicks, stopAt } from "../src/rules/business.ts";
import { beamWait, invasionTick } from "../src/rules/invasion.ts";
import type { DayState } from "../src/rules/types.ts";
import { buildChasers } from "../src/view/chasers.ts";
import { createClimber } from "../src/view/climbing.ts";
import { buildClues } from "../src/view/clues.ts";
import { beamTop, deckHeight, liftOf, ollieOf } from "../src/view/lift.ts";
import { buildLofts } from "../src/view/lofts.ts";
import { buildSaucers, floatTime } from "../src/view/saucers.ts";
import { buildTrain } from "../src/view/train.ts";
import { started } from "./support/replay.ts";

const riding = (tick: number): DayState => ({
  ...started(1, 7, 2),
  line: { at: 100, from: stopAt(0), to: 1 },
  tick: 100 + tick,
  x: stopAt(0).x,
  z: stopAt(0).z,
});

describe("the hero carried", () => {
  it("rises in the Green Line's lift, rides at the deck's height and comes down at the next stop", () => {
    expect(liftOf(riding(0))).toBe(0);
    expect(liftOf(riding(lineLift))).toBe(deckHeight);
    expect(liftOf(riding(lineTicks / 2))).toBe(deckHeight);
    expect(liftOf(riding(lineTicks))).toBe(0);
    expect(liftOf(riding(lineTicks - lineLift / 2))).toBeCloseTo(
      deckHeight / 2,
    );
    expect(liftOf({ line: { at: 0, from: stopAt(0), to: 1 } })).toBe(0);
  });

  it("floats up a saucer's beam, waits under it while aboard, and stands on the ground otherwise", () => {
    const day = started(1, 7, 3);
    expect(liftOf(day)).toBeNull();
    expect(liftOf({ ...day, beamed: beamWait })).toBe(beamTop);
    expect(liftOf({ ...day, beamed: beamWait / 2 })).toBeCloseTo(beamTop / 2);
    expect(liftOf({ ...day, talk: "visit" })).toBe(beamTop);
    expect(liftOf({ ...day, talk: "abduction" })).toBe(beamTop);
  });

  it("pops an ollie every two and a half seconds while a board rolls", () => {
    const board = { ...started(1, 7, 2), dir: 0, ride: "board" as const };
    expect(ollieOf({ ...board, tick: 7 })).toBeGreaterThan(0.3);
    expect(ollieOf({ ...board, tick: 40 })).toBe(0);
    expect(ollieOf({ ...board, dir: -1, tick: 7 })).toBe(0);
    expect(ollieOf({ ...board, ride: "scooter", tick: 7 })).toBe(0);
    expect(ollieOf({ ...board, talk: "do-skate", tick: 7 })).toBe(0);
    expect(ollieOf({ ride: "board" })).toBe(0);
  });

  it("is shown up there by the climber, easing up and back down", () => {
    const climber = createClimber();
    const top = riding(lineTicks / 2);
    let shown = climber.follow(top, top.x / 100, top.z / 100, 0, 0.1);
    for (let frame = 0; frame < 10; frame += 1)
      shown = climber.follow(top, top.x / 100, top.z / 100, 0, 0.1);
    expect(shown.y).toBeCloseTo(deckHeight);
    const off = { ...top, line: null };
    for (let frame = 0; frame < 10; frame += 1)
      shown = climber.follow(off, top.x / 100, top.z / 100, 0, 0.1);
    expect(shown.y).toBe(0);
    const board = { ...off, dir: 0, ride: "board" as const, tick: 7 };
    expect(climber.follow(board, 180, 180, 0, 0.1).y).toBeGreaterThan(0.3);
  });
});

describe("the scenery of the shop, the train, the beams and the clues", () => {
  it("has a station at every stop, and the hero's own car running along the rails while they ride", () => {
    const train = buildTrain();
    expect(
      train.root.children.filter(({ name }) => name.startsWith("station-")),
    ).toHaveLength(8);
    const car = train.root.getObjectByName("rider-car");
    train.show(null, 1);
    expect(car?.visible).toBe(false);
    const half = riding(lineTicks / 2);
    train.show({ ...half, x: 12_800 }, 2);
    expect([car?.visible, car?.position.toArray()]).toEqual([
      true,
      [128, deckHeight, stopAt(0).z / 100],
    ]);
    expect(car?.rotation.y).toBeCloseTo(Math.PI / 2);
  });

  it("lights the clues under frost vision, and only then", () => {
    const clues = buildClues();
    const shown = (): readonly string[] =>
      clues.root.children
        .filter(({ visible }) => visible)
        .map(({ name }) => name);
    const mania = started(1, 7, 3);
    clues.show(mania, 1);
    expect(shown()).toEqual([]);
    clues.show({ ...mania, looking: true }, 2);
    expect(shown()).toEqual([
      "clue-glow",
      "clue-magnet",
      "clue-pizza",
      "clue-vacuum",
    ]);
    clues.show({ ...mania, done: ["item-glow"], looking: true, tools: 3 }, 3);
    expect(shown()).toEqual(["clue-pizza"]);
    clues.show(null, 4);
    expect(shown()).toEqual([]);
  });

  it("floats townspeople up each beam, and picks the purse snatcher out with a bobbing arrow", () => {
    const saucers = buildSaucers();
    const down = { ...started(1, 7, 3), tick: invasionTick };
    saucers.show(down, 10, false);
    saucers.show(down, 15, false);
    const floaters = saucers.root.children.filter(
      ({ name }) => name === "beamed",
    );
    expect(floaters.map(({ visible }) => visible)).toEqual([
      true,
      true,
      true,
      true,
    ]);
    // Halfway through a float, the first is a quarter of the way up (it starts slowly).
    saucers.show(down, floatTime * 3.5, false);
    expect(floaters[0]?.position.y).toBeCloseTo(19 / 4);
    const chasers = buildChasers();
    const to = { heading: 0, x: 0, y: 0, z: 0 };
    chasers.show(
      { ...started(1, 7, 1), thief: { x: 21_600, z: 17_500 } },
      to,
      1,
      0.1,
    );
    const arrow = chasers.actors[3]?.root.getObjectByName("thief-arrow");
    expect(arrow?.position.y).toBeGreaterThan(2.8);
  });

  it("puts the shop's laptop screen on the desk by the loft's door", () => {
    const lofts = buildLofts();
    lofts.show({ ...started(1, 7, 2), tick: 600 });
    const screen = lofts.root.getObjectByName("till-screen");
    expect(screen?.position.y).toBeCloseTo(0.93);
  });
});
