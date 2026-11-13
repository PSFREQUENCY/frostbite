import { Matrix4, PerspectiveCamera, type Scene } from "three";
import { describe, expect, it, vi } from "vitest";

import { questAt } from "../src/quest.ts";
import { moonPad, nightTick, waterline } from "../src/rules/constants.ts";
import { spotNamed, spots } from "../src/rules/places.ts";
import type { DayState } from "../src/rules/types.ts";
import { buildParked } from "../src/view/parked.ts";
import type { Stage } from "../src/view/stage.ts";
import { lanternShot, timeOf, buildTown } from "../src/view/town.ts";
import { busy } from "../src/view/traffic.ts";
import { createWorldView } from "../src/view/world-view.ts";
import { started } from "./support/replay.ts";

const car = spots.find((spot) => spot.kind === "parked" && spot.ride === "car");

describe("the time of day", () => {
  it("runs the sun from morning to dusk by the clock, and is night from the lantern hour, with rush hours in the traffic", () => {
    expect(timeOf(0)).toEqual({ along: 0, dark: 0 });
    expect(timeOf(nightTick).dark).toBe(1);
    expect(timeOf(nightTick * 0.9).dark).toBeGreaterThan(0);
    expect(timeOf(nightTick * 0.5).along).toBe(0.5);
    expect(busy(0, 0)).toBeGreaterThan(busy(0.25, 0));
    expect(busy(0.5, 0)).toBeGreaterThan(busy(0.5, 1));
  });
});

describe("where to go next", () => {
  it("points at the first morning's goals, the story's beat, the newbie, home for the drain, and the beach", () => {
    const morning = started(1, 7, 1);
    expect(questAt(morning)).toEqual({ x: 18_000, z: 18_000 });
    const crossed = { ...morning, done: ["riot"] };
    expect(questAt(crossed)).toEqual(spotNamed("frost"));
    const heard = { ...morning, done: ["riot", "speech"] };
    expect(questAt(heard)).toEqual(spotNamed("faucet"));
    const gig = { ...heard, paper: 1 };
    expect(questAt({ ...gig, gigs: 1 })).toEqual(spotNamed("home-7"));
    expect(questAt(gig)).toMatchObject({ kind: "gig" });
    expect(questAt({ ...gig, parcel: "faucet" })).toEqual(spotNamed("faucet"));
    expect(questAt({ ...morning, drain: 1 })).toEqual(spotNamed("home-7"));
    expect(questAt({ ...morning, gate: 1 })).toEqual({
      x: expect.any(Number),
      z: waterline,
    });
    expect(questAt({ ...started(3, 7, 2) })).not.toBeNull();
    expect(questAt({ ...morning, loop: 1 })).not.toBeNull();
    expect(questAt({ ...morning, ended: true })).toBeNull();
  });
});

describe("the street", () => {
  it("takes a car from its kerb, throws glass, and leaves it where the hero steps off", () => {
    if (car === undefined) throw new Error("no parked car");
    const parked = buildParked();
    const day = started(1, 7, 2);
    const mesh = parked.root.getObjectByName("parked-car");
    const glass = parked.root.getObjectByName("glass-burst");
    parked.show(day, 10, 10, 0, 0);
    const taken = { ...day, done: [car.id], ride: "car" as const, tick: 30 };
    parked.show(taken, 10, 10, 0, 1);
    parked.show(taken, 10, 10, 0, 1.3);
    expect(glass?.visible).toBe(true);
    parked.show({ ...taken, ride: "foot" }, 20, 20, 0, 3);
    expect(glass?.visible).toBe(false);
    const matrix = new Matrix4();
    if (mesh === undefined || !("getMatrixAt" in mesh) || !("count" in mesh))
      throw new Error("no cars");
    const left = mesh as unknown as {
      count: number;
      getMatrixAt(index: number, into: Matrix4): void;
    };
    left.getMatrixAt(left.count - 6, matrix);
    expect(matrix.elements[12]).toBeCloseTo(20);
    expect(parked.paintOf(car.id)).toMatch(/^#/u);
  });

  it("lights the night, lifts the lanterns and the hero's own, and points the camera up after it", () => {
    const town = buildTown();
    const night = { ...started(1, 7, 2), tick: nightTick };
    town.idle(1);
    town.show(night, 300, 60, 0, 1, 0.016);
    expect(town.lantern(1)).toBeNull();
    town.write("to the moon");
    town.show({ ...night, wish: 2 }, 300, 60, 0, 2, 0.016);
    expect(town.root.getObjectByName("my-lantern")?.visible).toBe(true);
    town.show({ ...night, wish: 2 }, 300, 60, 0, 3, 0.016);
    expect(town.lantern(3)?.[1]).toBeGreaterThan(1.6);
    expect(town.lantern(2 + lanternShot + 1)).toBeNull();
    expect(town.root.getObjectByName("lantern-sky")?.parent?.visible).toBe(
      true,
    );
  });
});

describe("the world view's extras", () => {
  const draw = vi.fn<(scene: Scene) => void>();
  const stage: Stage = { camera: new PerspectiveCamera(), draw };
  const part = (name: string) => draw.mock.lastCall?.[0].getObjectByName(name);

  it("jumps, writes the lantern, turns the camera behind a walker, and puts a helmet on the moon", () => {
    const view = createWorldView(stage);
    const day = { ...started(1, 7, 2), dir: 0 };
    view.day(day, 1, 0.016, false);
    const yaw = view.yaw();
    view.jump();
    for (let frame = 0; frame < 30; frame += 1)
      view.day(day, 1 + frame * 0.05, 0.05, false);
    expect(view.yaw()).not.toBe(yaw);
    view.write("gm");
    view.day({ ...day, tick: nightTick, wish: 1 }, 3, 0.016, false);
    view.day({ ...day, tick: nightTick, wish: 1 }, 4, 0.016, false);
    expect(part("my-lantern")?.visible).toBe(true);
    const moon: DayState = { ...day, x: moonPad.x, z: moonPad.z - 600 };
    view.day(moon, 5, 0.016, false);
    expect([part("helmet")?.visible, part("town")?.visible]).toEqual([
      true,
      false,
    ]);
    view.day({ ...day, gait: 3, dir: -1 }, 6, 0.016, false);
    expect(part("hero-7")?.rotation.x).toBeGreaterThan(1);
  });
});
