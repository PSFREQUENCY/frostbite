import { describe, expect, it } from "vitest";

import { canClimb, roofLevel, storeys } from "../src/rules/climb.ts";
import { advance } from "../src/rules/day.ts";
import { degenRules } from "../src/rules/index.ts";
import {
  letterAt,
  letters,
  onLetterTop,
  onMountain,
  peak,
  seatNear,
  signFace,
} from "../src/rules/mountain.ts";
import type { DayState } from "../src/rules/types.ts";
import { onLand, onStreet, onWater } from "../src/rules/world.ts";
import { refusal, started } from "./support/replay.ts";

function step(
  state: DayState,
  type: string,
  data: Readonly<Record<string, number>> = {},
): DayState {
  const stepped = degenRules.step(state, {
    data: { ...data, tick: state.tick },
    type,
  });
  if (!stepped.ok) throw new Error(stepped.reason);
  return stepped.state;
}
const g = letters[2];
if (g === undefined) throw new Error("no G");
const middle = Math.floor((g.z0 + g.z1) / 2);

describe("Mount WAGMI", () => {
  it("rises out of the sea east of The Old Floe, its slopes walked on from the Floe's middle street, by feet only, and boats keep off", () => {
    for (const x of [35_900, 38_000, 42_000, 45_500])
      expect([onLand(x, 6_000), onStreet(x, 6_000)], String(x)).toEqual([
        true,
        x < 36_000,
      ]);
    expect(onMountain(peak.x, peak.z)).toBe(true);
    expect(onWater(40_000, 6_000)).toBe(false);
    expect(onWater(40_000, -2_000)).toBe(true);
    // Walking east off the end of the Floe's middle street carries on up the trail.
    const start = { ...started(3, 7, 2), x: 35_000, z: 6_000 };
    const hiked = advance(step(start, "move", { dir: 0 }), 1_200);
    expect(hiked.x).toBeGreaterThan(40_000);
    expect(hiked.z).toBe(6_000);
  });

  it("keeps feet out of the sign, but lets them climb any letter from in front, sit on its top, and climb back down", () => {
    expect(onMountain(signFace + 10, middle)).toBe(false);
    expect(onMountain(signFace + 400, middle)).toBe(false);
    expect(letterAt(signFace - 100, middle)).toBe(2);
    expect(letterAt(signFace - 400, middle)).toBe(-1);
    const terrace = { ...started(3, 7, 2), x: signFace - 100, z: middle };
    expect(canClimb(terrace)).toBe(true);
    expect(refusal({ ...terrace, z: 9_000 }, "lift", { by: 1, tick: 0 })).toBe(
      "nothing to climb here",
    );
    let climber = terrace;
    for (let storey = 0; storey < storeys; storey += 1)
      climber = step(climber, "lift", { by: 1 });
    expect([climber.level, climber.x]).toEqual([storeys, terrace.x]);
    const sat = step(climber, "lift", { by: 1 });
    expect([
      sat.level,
      onLetterTop(sat.x, sat.z),
      sat.done.includes("wagmi"),
      sat.done.includes("roof"),
    ]).toEqual([roofLevel, true, true, false]);
    // Nobody walks along a letter's top: a sitter stays put.
    const still = advance(step(sat, "move", { dir: 4 }), sat.tick + 90);
    expect([still.x, still.z]).toEqual([sat.x, sat.z]);
    const down = step(sat, "lift", { by: -1 });
    expect([down.level, down.x < signFace]).toEqual([storeys, true]);
  });

  it("takes a climber up at the letter's nearest seat: a W's middle or outer strokes, an M's stems, an A's peak", () => {
    expect(
      [4_010, 4_300, 4_700, 5_100, 7_300, 7_400, 7_900, 9_000].map(seatNear),
    ).toEqual([4_078, 4_450, 4_822, 5_400, 7_512, 7_512, 7_875, 9_000]);
    const below = { ...started(3, 7, 2), x: signFace - 100, z: 4_300 };
    const up = step(below, "lift", { by: 1 });
    expect([up.level, up.x, up.z]).toEqual([1, below.x, 4_450]);
    let climber = up;
    for (let storey = 1; storey <= storeys; storey += 1)
      climber = step(climber, "lift", { by: 1 });
    expect([
      climber.level,
      climber.z,
      onLetterTop(climber.x, climber.z),
    ]).toEqual([roofLevel, 4_450, true]);
  });
});
