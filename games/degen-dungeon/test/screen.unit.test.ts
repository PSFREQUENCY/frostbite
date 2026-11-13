// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import { guideFor } from "../src/guide.ts";
import { spots } from "../src/rules/places.ts";
import { colour, drawMap, drawScreen } from "../src/screen/flat.ts";
import { resultOf } from "../src/screen/result.ts";
import { started } from "./support/replay.ts";

// A drawing surface that writes down every rectangle it is asked to fill, with the colour it was filled in.
function surface() {
  const fills: [string, number, number, number, number][] = [];
  const cleared: number[][] = [];
  const context = {
    canvas: { height: 288, width: 512 },
    clearRect: (...box: number[]) => cleared.push(box),
    fillRect(x: number, y: number, w: number, h: number) {
      fills.push([this.fillStyle, x, y, w, h]);
    },
    fillStyle: "",
  };
  return {
    cleared,
    context: context as unknown as CanvasRenderingContext2D,
    fills,
  };
}
const day = { ...started(1, 7, 1), tux: { x: 9_000, z: 18_000 } };

describe("the island from above", () => {
  it("draws every lot and spot, and the hero and the tux once a day is on", () => {
    const empty = surface();
    drawMap(empty.context, null, { size: 360, x: 0, y: 0 });
    expect(empty.fills.filter(([tint]) => tint === colour.lot)).toHaveLength(
      36,
    );
    expect(empty.fills.filter(([tint]) => tint === colour.spot)).toHaveLength(
      spots.length,
    );
    expect(empty.fills.some(([tint]) => tint === colour.hero)).toBe(false);
    const played = surface();
    drawMap(played.context, day, { size: 360, x: 0, y: 0 });
    expect(played.fills.find(([tint]) => tint === colour.hero)).toEqual([
      colour.hero,
      178,
      153,
      4,
      4,
    ]);
    expect(played.fills.find(([tint]) => tint === colour.tux)).toEqual([
      colour.tux,
      88,
      178,
      4,
      4,
    ]);
    drawMap(played.context, { ...day, tux: null }, { size: 360, x: 0, y: 0 });
    expect(played.fills.filter(([tint]) => tint === colour.tux)).toHaveLength(
      1,
    );
  });

  it("is the whole screen where there is no 3D picture, and a map in the corner where there is", () => {
    const flat = surface();
    drawScreen(flat.context, day, false);
    expect(flat.fills[0]).toEqual([colour.sea, 0, 0, 512, 288]);
    expect(flat.fills[1]).toEqual([colour.street, 120, 8, 272, 272]);
    const layered = surface();
    drawScreen(layered.context, day, true);
    expect(layered.cleared).toEqual([[0, 0, 512, 288]]);
    expect(layered.fills[0]).toEqual([colour.street, 432, 8, 72, 72]);
  });
});

describe("the cards", () => {
  it("after a day say how it ended, what it made, the status and the best", () => {
    const over = { best: 900, newBest: false, phase: "over" };
    expect(resultOf(day, { ...over, phase: "running" })).toBeNull();
    const home = resultOf(
      { ...day, cause: "home", gigs: 3, made: 640, storm: 60 },
      over,
    );
    expect(home?.rows.map(({ text }) => text)).toEqual([
      "HOME SAFE",
      "MADE 700 DUN   GRINDER",
      "BEST 900",
      "ENTER FOR ANOTHER DAY",
    ]);
    expect(home?.rows[0]?.colour).toBe(colour.spot);
    const frozen = resultOf({ ...day, cause: "frozen" }, over);
    expect([frozen?.rows[0]?.text, frozen?.rows[0]?.colour]).toEqual([
      "FROZEN BY THE TUXES",
      colour.tux,
    ]);
    expect(resultOf(day, over)?.rows[0]?.text).toBe("YOU CALLED IT A DAY");
  });

  it("before one are the hero select: the hero at the front with five stats, or a question for one still locked", () => {
    const rally = guideFor(7, { day: 2, machine: false, slip: false });
    expect(rally.lines?.slice(0, 2)).toEqual([
      "< RALLY THE BULL >",
      "SPD 3  MUS 5  STL 1  CHA 4  SMT 2",
    ]);
    expect([rally.title, rally.start, rally.touchStart]).toEqual([
      "DEGEN DUNGEON",
      "ENTER TO WAKE UP - DAY 2",
      "TAP TO WAKE UP - DAY 2",
    ]);
    expect(
      guideFor(9, { day: 1, machine: false, slip: false }).lines?.[0],
    ).toBe("< ??? >");
    expect(guideFor(9, { day: 1, machine: false, slip: true }).lines?.[0]).toBe(
      "< SLIP THE UNICORN >",
    );
    expect(guideFor(42, { day: 1, machine: false, slip: true }).start).toBe(
      "ARROWS TURN THE RING",
    );
  });
});
