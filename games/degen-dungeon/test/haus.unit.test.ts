import { describe, expect, it } from "vitest";

import { storeys } from "../src/rules/climb.ts";
import { degenRules } from "../src/rules/index.ts";
import {
  branchOf,
  haus,
  hoverPad,
  inLift,
  inLobby,
  isletRadius,
  liftAt,
  liftTenths,
  liftTicks,
  onFloor,
  onIslet,
  penthouseFloor,
  topFloor,
  trunkRadius,
} from "../src/rules/haus.ts";
import type { DayState } from "../src/rules/types.ts";
import { hoverable, onStreet, onWater } from "../src/rules/world.ts";
import { started } from "./support/replay.ts";

// One input taken by the rules, or the reason it was refused.
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
// Moves the day on by `ticks` with an input that changes nothing but the clock: a move that stands still.
const advanceTo = (state: DayState, ticks: number): DayState => {
  const stepped = degenRules.step(state, {
    data: { dir: -1, tick: state.tick + ticks } as never,
    type: "move",
  });
  if (!stepped.ok) throw new Error(stepped.reason);
  return stepped.state;
};
const inLobbyAtLift = (keycard = false): DayState => ({
  ...started(1, 7, 3),
  keycard,
  x: liftAt.x,
  z: liftAt.z,
});

describe("Haus De Savage", () => {
  it("stands on its islet with a bridge from the shore, a lobby inside its trunk, and keeps boats off", () => {
    expect(onIslet(haus.x, haus.z - isletRadius + 200)).toBe(true);
    expect(onIslet(haus.x, 36_500)).toBe(true);
    expect(onStreet(haus.x, 36_500)).toBe(true);
    // The trunk is no plaza; its lobby is inside, through the doorway that faces the bridge.
    expect(onIslet(haus.x + trunkRadius - 100, haus.z)).toBe(false);
    expect([
      inLobby(haus.x, haus.z),
      inLobby(haus.x, haus.z - trunkRadius),
    ]).toEqual([true, true]);
    expect(inLobby(haus.x + trunkRadius, haus.z)).toBe(false);
    expect([onWater(haus.x, haus.z), onWater(haus.x + 3_000, haus.z)]).toEqual([
      false,
      true,
    ]);
  });

  it("lets the hover car go over the streets, the sea and the islet's plaza, but not through buildings or the trunk", () => {
    expect([
      hoverable(18_000, 18_000),
      hoverable(-2_000, 18_000),
      hoverable(37_500, 18_000),
    ]).toEqual([true, true, true]);
    expect([hoverable(14_000, 14_000), hoverable(haus.x, haus.z)]).toEqual([
      false,
      false,
    ]);
    expect(hoverable(haus.x - 1_500, haus.z + 500)).toBe(true);
  });

  it("gives every floor a ring of glass and a branch of garden turning round the trunk, the penthouse a pad and the roof a crown", () => {
    const branches = Array.from({ length: penthouseFloor - 1 }, (_, index) =>
      branchOf(index + 1),
    );
    for (const [index, branch] of branches.entries()) {
      // Never over the elevators on the south side, and never where the floor below has its own.
      expect(Math.abs(branch.x - haus.x) > 500 || branch.z < haus.z).toBe(true);
      expect(branch).not.toEqual(branches[index - 1]);
      expect(onFloor(index + 1, branch.x, branch.z)).toBe(true);
    }
    expect([
      onFloor(5, haus.x, haus.z + 1_000),
      onFloor(5, haus.x, haus.z + 1_400),
    ]).toEqual([true, false]);
    expect([
      onFloor(penthouseFloor, hoverPad.x, hoverPad.z),
      onFloor(4, hoverPad.x, hoverPad.z),
    ]).toEqual([true, false]);
    expect([
      onFloor(topFloor, haus.x + 1_500, haus.z),
      onFloor(0, haus.x, haus.z),
      onFloor(22, haus.x, haus.z),
    ]).toEqual([true, false, false]);
  });

  it("rides the glass elevator a floor at a time on the climb keys, and nobody walks or acts while it runs", () => {
    const lobby = inLobbyAtLift();
    expect(inLift(lobby)).toBe(true);
    expect(inLift({ ...lobby, ride: "car" })).toBe(false);
    const going = step(lobby, "lift", { by: 1 });
    expect(going.elevator).toEqual({ at: lobby.tick, from: 0, to: 1 });
    expect(why(going, "act")).toBe("the elevator is moving");
    expect(why(going, "lift", { by: 1 })).toBe("the elevator is moving");
    const walking = step(going, "move", { dir: 0 });
    const there = advanceTo(walking, liftTicks(0, 1));
    expect([there.floor, there.elevator, there.x]).toEqual([1, null, liftAt.x]);
    expect(why(there, "lift", { by: 1 })).toBeNull();
    const down = advanceTo(step(there, "lift", { by: -1 }), liftTicks(1, 0));
    expect(down.floor).toBe(0);
    expect(why(down, "lift", { by: -1 })).toBe("no higher or lower than that");
  });

  it("goes straight to the lobby or the rooftop from its panel, the top floors only with the penthouse keycard", () => {
    const panel = step(inLobbyAtLift(), "act");
    expect(panel.talk).toBe("haus-lift");
    expect(why(panel, "pick", { choice: 3 })).toBe(
      "the top floors need a penthouse keycard",
    );
    const keyed = step({ ...inLobbyAtLift(true) }, "act");
    const rising = step(keyed, "pick", { choice: 3 });
    expect(rising.elevator?.to).toBe(topFloor);
    // Partway up, the car is between floors (in tenths), and at the end the doors open on the roof.
    const ride = rising.elevator;
    if (ride === null) throw new Error("no ride");
    expect(liftTenths(ride, ride.at)).toBe(0);
    expect(liftTenths(ride, ride.at + 15 + 8 * 10 + 4)).toBe(105);
    expect(liftTenths(ride, ride.at + liftTicks(0, topFloor))).toBe(210);
    const roof = advanceTo(
      step(rising, "pick", { choice: 4 }),
      liftTicks(0, topFloor),
    );
    expect([roof.floor, roof.talk]).toEqual([topFloor, null]);
    // Up on a floor the hero cannot walk off its edge.
    const walked = advanceTo(step(roof, "move", { dir: 4 }), 600);
    expect(onFloor(topFloor, walked.x, walked.z)).toBe(true);
    expect(walked.z).toBeGreaterThan(liftAt.z);
    const lobby = step(step(roof, "act"), "pick", { choice: 2 });
    expect(lobby.elevator?.to).toBe(0);
    expect(why(step(roof, "act"), "pick", { choice: 3 })).toBe(
      "you are on that floor",
    );
  });

  it("keeps the chasers and the powers off the floors, but lets the dragon leave from the rooftop", () => {
    const upstairs: DayState = {
      ...inLobbyAtLift(true),
      floor: 12,
      heat: 450,
      x: haus.x,
      z: haus.z,
    };
    const later12 = advanceTo(upstairs, 200);
    expect([later12.cop, later12.tux]).toEqual([null, null]);
    expect(why({ ...upstairs, powerAt: -10_000 }, "power")).toBe(
      "your power needs your own feet on the ground",
    );
    const dragon = {
      ...started(1, 1, 3),
      floor: topFloor,
      powerAt: -10_000,
      x: haus.x,
      z: haus.z,
    };
    const flown = step(dragon, "power");
    expect([flown.floor, flown.flyHigh, flown.flyUntil > flown.tick]).toEqual([
      0,
      true,
      true,
    ]);
    // The rooftop's helicopter lifts off high over the islet.
    const heli = step({ ...dragon, x: haus.x, z: haus.z + 1_400 }, "act");
    expect([heli.ride, heli.level, heli.floor]).toEqual(["heli", storeys, 0]);
    expect(advanceTo(heli, 1).ride).toBe("heli");
  });
});
