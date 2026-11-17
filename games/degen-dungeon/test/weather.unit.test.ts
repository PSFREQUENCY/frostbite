import { describe, expect, it } from "vitest";

import {
  borrowHeat,
  fomoTicks,
  heatFadeTicks,
  visionEvery,
  visionTicks,
} from "../src/rules/constants.ts";
import { advance } from "../src/rules/day.ts";
import { degenRules } from "../src/rules/index.ts";
import { beams } from "../src/rules/invasion.ts";
import { paceOf } from "../src/rules/move.ts";
import { spots } from "../src/rules/places.ts";
import type { DayState, Weather } from "../src/rules/types.ts";
import {
  calmRep,
  fadeIn,
  harsh,
  spellOf,
  spellStarts,
  spellTicks,
} from "../src/rules/weather.ts";
import { started } from "./support/replay.ts";

const act = (day: DayState): DayState => {
  const stepped = degenRules.step(day, {
    data: { tick: day.tick },
    type: "act",
  });
  if (!stepped.ok) throw new Error(stepped.reason);
  return stepped.state;
};
// A crossing well away from every spot, on a day with no saucers.
const clear = beams[1] ?? { x: 0, z: 0 };

describe("the weather", () => {
  it("turns three times a day by the seed, harsh half the time, a third for a player of good standing", () => {
    const spells = (rep: number): Weather[] =>
      Array.from({ length: 300 }, (_, seed) => spellOf(seed, 2, 1, rep));
    const harshOf = (rep: number): number =>
      spells(rep).filter((one) => one !== "clear").length;
    expect(spellOf(9, 2, 1, 0)).toBe(spellOf(9, 2, 1, 0));
    expect(new Set(spells(0))).toEqual(new Set([...harsh, "clear"]));
    expect(harshOf(0)).toBeGreaterThan(120);
    expect(harshOf(0)).toBeLessThan(180);
    expect(harshOf(calmRep)).toBeLessThan(harshOf(0) - 30);
  });

  it("holds a spell for three minutes and then clears", () => {
    const seed = Array.from({ length: 50 }, (_, one) => one).find(
      (one) => spellOf(one, 4, 0, 0) === "storm",
    );
    if (seed === undefined) throw new Error("no stormy seed");
    const morning = started(seed, 7, 4);
    const start = spellStarts[0] ?? 0;
    expect(advance(morning, start - 1).weather).toBe("clear");
    expect(advance(morning, start).weather).toBe("storm");
    expect(advance(morning, start + spellTicks - 1).weather).toBe("storm");
    expect(advance(morning, start + spellTicks).weather).toBe("clear");
  });

  it("hides the hero in fog, snow and blizzards, slows the fade in a heatwave, and makes FOMO jumpy in storms and gales", () => {
    const fades = (["clear", "fog", "snow", "blizzard", "heat"] as const).map(
      (weather) => fadeIn({ weather }, heatFadeTicks),
    );
    expect(fades).toEqual([
      heatFadeTicks,
      heatFadeTicks / 2,
      heatFadeTicks / 2,
      heatFadeTicks / 2,
      heatFadeTicks * 2,
    ]);
    const calm = { ...started(4, 7, 4), tick: 2_000 };
    const fomo = (weather: Weather): number =>
      advance({ ...calm, weather }, 2_000 + fomoTicks * 12).fomo;
    expect(fomo("storm")).toBe(fomo("clear") + 4);
    expect(fomo("gale")).toBe(fomo("storm"));
    expect(advance({ ...calm, weather: "blizzard", dir: 0 }, 2_100).x).toBe(
      advance({ ...calm, dir: 0 }, 2_100).x,
    );
  });
});

describe("frost vision", () => {
  it("comes back every thirty seconds", () => {
    const spent = { ...started(1, 7, 1), tick: visionEvery - 5, vision: 0 };
    expect(advance(spent, visionEvery - 1).vision).toBe(0);
    expect(advance(spent, visionEvery).vision).toBe(visionTicks);
    const full = { ...spent, vision: 3 * visionTicks };
    expect(advance(full, visionEvery).vision).toBe(3 * visionTicks);
  });
});

describe("the rides on the kerb", () => {
  it("go at their own paces, and anything with an engine brings heat", () => {
    const day = started(1, 7, 5);
    expect(
      (["moto", "van", "truck", "semi"] as const).map((ride) =>
        paceOf({ ...day, ride }),
      ),
    ).toEqual([30, 26, 24, 20]);
    const van = spots.find(
      (spot) => spot.kind === "parked" && spot.ride === "van",
    );
    if (van === undefined) throw new Error("no van");
    const taken = act({ ...day, x: van.x, z: van.z });
    expect([taken.ride, taken.rideId, taken.heat]).toEqual([
      "van",
      van.id,
      borrowHeat,
    ]);
  });

  it("stay where they are left, the last six of them, and a hired ride is never left", () => {
    let day: DayState = { ...started(1, 7, 5), x: clear.x, z: clear.z };
    for (let one = 0; one < 7; one += 1)
      day = act({ ...day, ride: "car", rideId: `car-${String(one)}` });
    expect(day.left.map((ride) => ride.id)).toEqual(
      [1, 2, 3, 4, 5, 6].map((one) => `car-${String(one)}`),
    );
    expect(day.left[0]).toMatchObject({ ride: "car", x: clear.x, z: clear.z });
    const hired = act({ ...day, ride: "scooter", rideId: "" });
    expect([hired.ride, hired.left.length]).toEqual(["foot", 6]);
    const again = act(hired);
    expect([again.ride, again.rideId, again.left.length]).toEqual([
      "car",
      "car-6",
      5,
    ]);
  });
});
