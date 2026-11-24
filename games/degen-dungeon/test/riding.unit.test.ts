import { Color, Fog, Group, type Object3D, Scene } from "three";
import { describe, expect, it, vi } from "vitest";

import { invasionTick } from "../src/rules/invasion.ts";
import type { DayState } from "../src/rules/types.ts";
import { buildActor } from "../src/view/actor.ts";
import { buildBody, seatAngles } from "../src/view/body.ts";
import { kits } from "../src/view/kits.ts";
import { placeCast } from "../src/view/lead.ts";
import { buildParked } from "../src/view/parked.ts";
import type { Rides } from "../src/view/rides.ts";
import { buildRides } from "../src/view/rides.ts";
import { createRiding } from "../src/view/riding.ts";
import { buildSaucers } from "../src/view/saucers.ts";
import { doored, doorLength, seatsOf, swing } from "../src/view/seats.ts";
import type { Town } from "../src/view/town.ts";
import { buildWeatherFx } from "../src/view/weather-fx.ts";
import { heroLooks } from "../src/view/looks.ts";
import { started } from "./support/replay.ts";

const at = { heading: 0, x: 10, y: 0, z: 20 };
const riding = (ride: DayState["ride"], crew: number[] = []): DayState => ({
  ...started(1, 6, 3),
  crew,
  dir: 0,
  ride,
  rideId: `${ride}-1`,
});

describe("riding", () => {
  it("sits a rider astride and pedalling, astride on pegs, in a seat, or standing on a deck", () => {
    const pedal = [0, 1].map((side) => seatAngles("pedal", side, 0.3));
    expect(pedal[0]?.hip).not.toBeCloseTo(pedal[1]?.hip ?? 0);
    expect(seatAngles("seat", 0, 0).hip).toBeLessThan(-1.3);
    expect(seatAngles("saddle", 1, 0).knee).toBeGreaterThan(1.5);
    expect(seatAngles("deck", 0, 0).hip).toBeLessThan(0);
    expect(seatAngles("deck", 1, 0).hip).toBeGreaterThan(0);
    const look = heroLooks[6];
    if (look === undefined) throw new Error("no look");
    const body = buildBody(look);
    const hips = (): number[] => {
      const turns: number[] = [];
      body.root.traverse((part: Object3D) => turns.push(part.rotation.x));
      return turns;
    };
    body.pose(10, 1, false);
    const walking = hips();
    body.pose(10, 1, true, "pedal");
    expect(hips()).not.toEqual(walking);
    expect(body.hip).toBeGreaterThan(0.6);
  });

  it("seats the hero and crew on a ride with room, and runs the rest alongside", () => {
    const motion = (hop: number) => ({
      air: -1,
      dt: 0.016,
      hop,
      seconds: 1,
      way: "upright" as const,
    });
    const cast = [6, 7, 8].map((hero) => buildActor(hero));
    const put = (ride: DayState["ride"], crew: number[]) => {
      const state = { ...riding(ride, crew), hero: 0 };
      placeCast(cast, state, at, motion(0));
      return cast.map((actor) => actor.root.position.clone());
    };
    const [hero, mate] = put("bike", [1]);
    expect(
      Math.hypot((mate?.x ?? 0) - at.x, (mate?.z ?? 0) - at.z),
    ).toBeGreaterThan(1);
    expect(hero?.y).toBeGreaterThan(-0.5);
    const car = put("car", [1, 2]);
    expect(
      car.every((one) => Math.hypot(one.x - at.x, one.z - at.z) < 1.2),
    ).toBe(true);
    expect(put("boat", [1])[1]?.y).toBeCloseTo(0.7);
    const walking = { ...riding("foot", [1]), hero: 0 };
    placeCast(cast, walking, at, motion(0.5));
    expect(cast[0]?.root.position.y).toBeCloseTo(0.5);
    // Up a wall the hero climbs alone: the crew stay on the street below.
    placeCast(cast, walking, { ...at, y: 5.6 }, { ...motion(0), way: "hang" });
    expect([cast[0]?.root.position.y, cast[1]?.root.position.y]).toEqual([
      5.6, 0,
    ]);
    expect(seatsOf.van.length).toBeGreaterThan(seatsOf.car.length);
    expect(seatsOf.scooter[0]?.seat).toBe("deck");
  });

  it("swings a driver's door open and shut getting in, and again getting out on the ride left behind", () => {
    expect([
      doored("car"),
      doored("semi"),
      doored("bike"),
      doored("foot"),
    ]).toEqual([true, true, false, false]);
    expect([
      swing(-1),
      swing(0.1),
      swing(0.4),
      swing(0.85),
      swing(doorLength + 0.1),
    ]).toEqual([0, 0.4, 1, 0.5, 0]);
    const show = vi.fn<Rides["show"]>();
    const town = {
      leftAt: (id: string) =>
        id === "car-1" ? { turn: 0, x: 3, z: 4 } : undefined,
      paintOf: () => "#123456",
    } as unknown as Town;
    const ride = createRiding({ root: new Group(), show }, town);
    const foot = riding("foot");
    expect(ride.track(foot, 0)).toBe("");
    ride.show(foot, at, 0, 0);
    expect(show).toHaveBeenLastCalledWith("foot", 0, 0, 0, 0, 0);
    const car = riding("car");
    expect(ride.track(car, 1)).toBe("");
    ride.show(car, at, 0, 1.4);
    expect(show).toHaveBeenLastCalledWith(
      "car",
      10,
      0,
      20,
      0,
      1.4,
      "#123456",
      true,
      1,
    );
    expect(ride.track({ ...foot, left: [] }, 2)).toBe("car-1");
    ride.show(foot, at, 0, 2.5);
    expect(show).toHaveBeenLastCalledWith(
      "car",
      3,
      0,
      4,
      0,
      2.5,
      "#123456",
      true,
      1,
    );
    expect(ride.track(foot, 4)).toBe("");
    ride.show(foot, at, 0, 4);
    expect(show).toHaveBeenLastCalledWith("foot", 0, 0, 0, 0, 4);
    ride.track({ ...car, ride: "heli", rideId: "" }, 5);
    ride.show({ ...car, ride: "heli", rideId: "" }, at, 0, 5);
    expect(show).toHaveBeenLastCalledWith(
      "heli",
      10,
      0,
      20,
      0,
      5,
      undefined,
      false,
      0,
    );
  });

  it("builds every ride with its own kit, a door on the ones with a driver's door, and parks them all", () => {
    const rides = buildRides();
    for (const kind of ["moto", "semi", "truck", "van"] as const) {
      expect(kits[kind].length).toBeGreaterThan(4);
      rides.show(kind, 1, 0, 1, 0, 1, undefined, false, 1);
      expect(rides.root.getObjectByName(kind)?.visible).toBe(true);
    }
    expect(
      rides.root.getObjectByName("van")?.getObjectByName("door")?.rotation.y,
    ).toBeCloseTo(1.15);
    const parked = buildParked();
    expect(parked.root.getObjectByName("parked-semi")).toBeDefined();
  });
});

describe("the sky", () => {
  it("brings the saucers down over their beams, sends each home once the hero has been aboard it, and parks the hero's own saucer", () => {
    const saucers = buildSaucers();
    const visible = () =>
      saucers.root.children.filter((child) => child.visible).length;
    const day = started(1, 7, 3);
    saucers.show(day, 0, false);
    expect(visible()).toBe(0);
    const down = { ...day, tick: invasionTick };
    saucers.show(down, 10, false);
    saucers.show(down, 15, false);
    // Four hovering, four beams with someone floating up each, eight circling in the alarm.
    expect(visible()).toBe(20);
    saucers.show(down, 15, true);
    expect(saucers.root.visible).toBe(false);
    const home = { ...down, done: [...down.done, "contact", "beamup-0"] };
    saucers.show(home, 16, false);
    expect(visible()).toBe(18);
    saucers.show(home, 30, false);
    expect(visible()).toBe(9);
    // A later day: the visitors come back without the circling fleet.
    const later = { ...started(1, 7, 5), tick: invasionTick };
    saucers.show(later, 40, false);
    saucers.show(later, 45, false);
    expect(visible()).toBe(12);
    // Thirteen beam-ups park a saucer on the Old Floe lawn, until it is flown.
    const mine = { ...later, beamups: 13 };
    saucers.show(mine, 46, false);
    expect(visible()).toBe(13);
    saucers.show({ ...mine, ride: "saucer" }, 47, false);
    expect(visible()).toBe(12);
  });

  it("snows, storms, blows and burns round the hero, and closes the fog in", () => {
    const sky = buildWeatherFx();
    const scene = new Scene();
    scene.fog = new Fog("#000000", 40, 900);
    scene.background = new Color("#000000");
    const flakes = sky.root.getObjectByName("flakes");
    sky.show("clear", 0, 0, 1, scene);
    expect(flakes?.visible).toBe(false);
    for (const weather of ["snow", "blizzard", "gale", "heat"] as const) {
      sky.show(weather, 5, 5, 2, scene);
      expect(flakes?.visible, weather).toBe(true);
    }
    sky.show("fog", 0, 0, 3, scene);
    expect(scene.fog instanceof Fog ? scene.fog.far : 0).toBe(45);
    expect(
      scene.background instanceof Color && scene.background.r,
    ).toBeGreaterThan(0.3);
    const flashes = Array.from({ length: 2000 }, (_, step) => {
      sky.show("storm", 0, 0, step * 0.05, scene);
      return sky.root.children.some(
        (child) => "intensity" in child && child.intensity === 2.4,
      );
    });
    expect(flashes.some(Boolean)).toBe(true);
    expect(flashes.every(Boolean)).toBe(false);
  });
});
