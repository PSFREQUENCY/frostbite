import { describe, expect, it } from "vitest";

import { afterDay, freshProgress, nextRun } from "../src/progress.ts";
import { nightTick } from "../src/rules/constants.ts";
import {
  crownPlate,
  drops,
  hoverStand,
  jobPay,
  keepsCar,
  penthouseBed,
  penthousePrice,
  valetBay,
} from "../src/rules/deal.ts";
import { haus, hoverPad, penthouseFloor } from "../src/rules/haus.ts";
import { degenRules } from "../src/rules/index.ts";
import { openTo, spotNamed } from "../src/rules/places.ts";
import type { DayState } from "../src/rules/types.ts";
import { createRunSession } from "../src/session.ts";
import { started } from "./support/replay.ts";

const step = (
  state: DayState,
  type: string,
  data: Readonly<Record<string, number>> = {},
): DayState => {
  const stepped = degenRules.step(state, {
    data: { ...data, tick: state.tick } as never,
    type,
  });
  if (!stepped.ok) throw new Error(stepped.reason);
  return stepped.state;
};
const why = (
  state: DayState,
  type: string,
  data: Readonly<Record<string, number>> = {},
): string | null => {
  const stepped = degenRules.step(state, {
    data: { ...data, tick: state.tick } as never,
    type,
  });
  return stepped.ok ? null : stepped.reason;
};
const advance = (state: DayState, ticks: number): DayState => {
  const stepped = degenRules.step(state, {
    data: { dir: -1, tick: state.tick + ticks } as never,
    type: "move",
  });
  if (!stepped.ok) throw new Error(stepped.reason);
  return stepped.state;
};
// Acting at a place (standing on it), then picking an answer.
const at = (
  state: DayState,
  place: { readonly x: number; readonly z: number },
): DayState => ({ ...state, x: place.x, z: place.z });
const answer = (state: DayState, choice: number): DayState =>
  step(step(state, "act"), "pick", { choice });
const lot = spotNamed("fancy-lot");
const rocco = spotNamed("dh-jobs");

describe("the Fancy Lot and the Diamond Hands", () => {
  it("opens the lot from nightfall on the second day, and all day after", () => {
    if (lot === undefined) throw new Error("no lot");
    expect(openTo(lot, { ...started(1, 7, 1), tick: nightTick })).toBe(false);
    expect(openTo(lot, { ...started(1, 7, 2), tick: nightTick - 1 })).toBe(
      false,
    );
    expect(openTo(lot, { ...started(1, 7, 2), tick: nightTick })).toBe(true);
    expect(openTo(lot, started(1, 7, 3))).toBe(true);
  });

  it("lends the hover car, which crosses the sea where a car cannot, and takes it back on asking", () => {
    if (lot === undefined) throw new Error("no lot");
    const evening = at({ ...started(1, 7, 2), tick: nightTick }, lot);
    const dealt = answer(evening, 0);
    expect([dealt.hover, dealt.done.includes("hover-deal")]).toEqual([
      true,
      true,
    ]);
    expect(why(step(dealt, "act"), "pick", { choice: 0 })).toBe(
      "the hover car is yours already",
    );
    const driving = step(at(dealt, hoverStand), "act");
    expect(driving.ride).toBe("hover");
    // West off the island over the water: the hover car goes, a car stops at the shore.
    const shore = { ...driving, x: 300, z: 18_000 };
    expect(advance(step(shore, "move", { dir: 8 }), 60).x).toBeLessThan(-500);
    expect(
      advance(step({ ...shore, ride: "car" }, "move", { dir: 8 }), 60).x,
    ).toBeGreaterThan(0);
    expect(why(step(at(driving, lot), "act"), "pick", { choice: 1 })).toBe(
      "step out of it first",
    );
    const back = answer(at(dealt, lot), 1);
    expect([
      back.hover,
      why(step(at(back, lot), "act"), "pick", { choice: 1 }),
    ]).toEqual([false, "you have no hover car to hand back"]);
  });

  it("gives three jobs a day, one at a time, paying 10,000 DUN in all, the first only in the hover car", () => {
    if (rocco === undefined) throw new Error("no Rocco");
    const day: DayState = { ...started(1, 7, 3), hover: true };
    expect(openTo(rocco, { ...day, hover: false })).toBe(false);
    let now = answer(at(day, rocco), 0);
    expect(now.dhJob).toBe(1);
    expect(why(step(now, "act"), "pick", { choice: 0 })).toBe(
      "finish the job you have first",
    );
    expect(openTo(spotNamed("dh-drop-1") ?? rocco, now)).toBe(true);
    expect(openTo(spotNamed("dh-drop-2") ?? rocco, now)).toBe(false);
    const [first, second, third] = drops;
    if (first === undefined || second === undefined || third === undefined)
      throw new Error("no drops");
    expect(why(step(at(now, first), "act"), "pick", { choice: 0 })).toBe(
      "Ms. Opal's guest rides in the hover car: bring it",
    );
    const pocket = now.pocket;
    now = answer(at({ ...now, ride: "hover" }, first), 0);
    now = answer(at({ ...now, ride: "foot" }, rocco), 0);
    now = answer(at(now, second), 0);
    now = answer(at(now, rocco), 0);
    now = answer(at({ ...now, ride: "hover" }, third), 0);
    expect(now.pocket - pocket).toBe(10_000);
    expect(jobPay.reduce((sum, pay) => sum + pay, 0)).toBe(10_000);
    expect(
      why(step(at({ ...now, ride: "foot" }, rocco), "act"), "pick", {
        choice: 0,
      }),
    ).toBe("that is every job for today: come back tomorrow");
    expect([
      keepsCar(now),
      keepsCar(day),
      keepsCar({ ...now, hover: false }),
    ]).toEqual([true, false, false]);
  });

  it("sells the sky penthouse with its keycard, lifts the hover car to its pad, and brings it down again", () => {
    const lobby: DayState = {
      ...started(1, 7, 3),
      hover: true,
      x: haus.x,
      z: haus.z - 100,
    };
    expect(why(step(lobby, "act"), "pick", { choice: 0 })).toBe(
      "not enough DUN",
    );
    const bought = answer({ ...lobby, pocket: penthousePrice + 5 }, 0);
    expect([bought.keycard, bought.pocket, bought.talk]).toEqual([
      true,
      5,
      "haus-concierge",
    ]);
    expect(why(bought, "pick", { choice: 0 })).toBe(
      "the penthouse is yours already",
    );
    const valet = at({ ...bought, ride: "hover", talk: null }, valetBay);
    expect(
      why(step({ ...valet, ride: "foot" }, "act"), "pick", { choice: 0 }),
    ).toBe("drive the hover car onto the lift");
    const parked = answer(valet, 0);
    expect([parked.floor, parked.ride, parked.x]).toEqual([
      penthouseFloor,
      "foot",
      hoverPad.x + 300,
    ]);
    const down = step(parked, "act");
    expect([down.ride, down.floor, down.x, down.z]).toEqual([
      "hover",
      0,
      valetBay.x,
      valetBay.z,
    ]);
  });

  it("serves the Crown Plate on the roof, and puts a penthouse owner to bed up there", () => {
    const roof: DayState = {
      ...started(1, 7, 3),
      floor: 21,
      keycard: true,
      pocket: 1_000,
      tick: 500,
      x: haus.x - 1_000,
      z: haus.z - 500,
    };
    const fed = answer(roof, 0);
    expect([fed.pocket, fed.ateAt, fed.done.includes("ate-crown")]).toEqual([
      1_000 - crownPlate,
      500,
      true,
    ]);
    expect(
      why(step({ ...roof, pocket: 10 }, "act"), "pick", { choice: 0 }),
    ).toBe("not enough DUN");
    const bed = answer(
      { ...roof, floor: penthouseFloor, x: haus.x, z: haus.z - 500 },
      0,
    );
    expect([bed.ended, bed.cause]).toEqual([true, "home"]);
  });

  it("carries the car, its taking back and the keycard from day to day, and wakes a penthouse owner up there", () => {
    const init = (config: Readonly<Record<string, number>>) =>
      degenRules.init(3, { day: 4, hero: 7, ...config });
    const kept = init({ hover: 1, keycard: 1 });
    if (!kept.ok) throw new Error(kept.reason);
    expect([
      kept.state.hover,
      kept.state.keycard,
      kept.state.floor,
      kept.state.x,
      kept.state.z,
    ]).toEqual([true, true, penthouseFloor, penthouseBed.x, penthouseBed.z]);
    const taken = init({ owed: 1, repo: 1 });
    if (!taken.ok) throw new Error(taken.reason);
    expect([taken.state.hover, taken.state.done]).toEqual([
      false,
      ["evicted", "repossessed"],
    ]);
    expect(init({ hover: 1, repo: 1 })).toEqual({
      ok: false,
      reason: "hover or repo is 1, not both",
    });
    expect(init({ keycard: 2 })).toEqual({
      ok: false,
      reason: "keycard is 1 once the penthouse is bought",
    });
    expect(degenRules.init(3, { day: 1, hero: 7, hover: 1, loop: 1 }).ok).toBe(
      false,
    );
    // The page: a day with a job keeps the car; a day without gives it back; the keycard stays.
    const worked = {
      ...started(1, 7, 3),
      cause: "home",
      done: ["dh-job-1"],
      ended: true,
      hover: true,
      keycard: true,
    } as const;
    const after = afterDay({ ...freshProgress, day: 3 }, worked).progress;
    expect([after.hover, after.repo, after.keycard]).toEqual([
      true,
      false,
      true,
    ]);
    const idle = afterDay(after, { ...worked, done: [] }).progress;
    expect([idle.hover, idle.repo, idle.keycard]).toEqual([false, true, true]);
    expect(nextRun(idle)).toMatchObject({
      hover: false,
      keycard: true,
      repo: true,
    });
    const session = createRunSession({
      day: 4,
      hero: 7,
      keycard: true,
      repo: true,
      seed: 3,
    });
    expect([session.state().keycard, session.state().done]).toEqual([
      true,
      ["repossessed"],
    ]);
  });
});
