import { Group, Scene } from "three";
import { describe, expect, it } from "vitest";

import { spotNamed } from "../src/rules/places.ts";
import {
  haus,
  liftAt,
  liftTenths,
  penthouseFloor,
  topFloor,
} from "../src/rules/haus.ts";
import type { DayState } from "../src/rules/types.ts";
import { buildFancyLot } from "../src/view/fancy-lot.ts";
import { buildHaus } from "../src/view/haus.ts";
import { storeyHeight } from "../src/view/haus-floors.ts";
import { hoverHeight, liftOf } from "../src/view/lift.ts";
import { createPeople } from "../src/view/npcs.ts";
import { buildRides } from "../src/view/rides.ts";
import { buildThings } from "../src/view/things.ts";
import { started } from "./support/replay.ts";

const day = (more: Partial<DayState> = {}): DayState => ({
  ...started(1, 7, 3),
  ...more,
});
const clipOf = (root: Group): number => {
  let constant = Number.NaN;
  root.traverse((part) => {
    const material: unknown = "material" in part ? part.material : null;
    if (
      Number.isNaN(constant) &&
      material !== null &&
      typeof material === "object" &&
      "clippingPlanes" in material
    ) {
      const planes: unknown = material.clippingPlanes;
      if (Array.isArray(planes) && planes.length > 0) {
        const plane: unknown = planes[0];
        if (
          plane !== null &&
          typeof plane === "object" &&
          "constant" in plane &&
          typeof plane.constant === "number"
        )
          constant = plane.constant;
      }
    }
  });
  return constant;
};

describe("Haus De Savage on screen", () => {
  it("carries the hero's glass elevator up with them, and cuts away the tower above them while they are inside", () => {
    const tower = buildHaus();
    const lift = tower.root.getObjectByName("haus-lift");
    const ride = { at: 100, from: 0, to: 12 };
    tower.show(day({ elevator: ride, tick: 160, x: liftAt.x, z: liftAt.z }), 1);
    expect(lift?.position.y).toBeCloseTo(
      (liftTenths(ride, 160) / 10) * storeyHeight,
    );
    expect(clipOf(tower.root)).toBeCloseTo(
      (liftTenths(ride, 160) / 10) * storeyHeight + storeyHeight - 0.4,
    );
    tower.show(day({ floor: 9, x: haus.x, z: haus.z }), 2);
    expect(lift?.position.y).toBe(9 * storeyHeight);
    // On the roof, and outside, nothing is cut.
    tower.show(day({ floor: topFloor, x: haus.x, z: haus.z }), 3);
    expect(clipOf(tower.root)).toBe(1_000);
    tower.show(day({ x: 18_000, z: 18_000 }), 4);
    expect(clipOf(tower.root)).toBe(1_000);
    // In the lobby, the ceiling is cut so the camera can see in.
    tower.show(day({ x: haus.x, z: haus.z }), 5);
    expect(clipOf(tower.root)).toBeCloseTo(storeyHeight - 0.4);
    const side = tower.root.getObjectByName("haus-lift-side");
    const before = side?.position.y;
    tower.show(null, 9);
    expect(side?.position.y).not.toBe(before);
  });

  it("shows the hover car turning on the showroom's turntable until the deal is made, and Ms. Opal's yacht bobbing", () => {
    const lot = buildFancyLot();
    const car = lot.root.getObjectByName("fancy-display");
    const turntable = lot.root.getObjectByName("fancy-turntable");
    const yacht = lot.root.getObjectByName("opal-yacht");
    lot.show(day(), 1);
    const [turned, bobbed] = [turntable?.rotation.y, yacht?.position.y];
    expect(car?.visible).toBe(true);
    lot.show(day({ hover: true }), 2);
    expect([
      car?.visible,
      turntable?.rotation.y === turned,
      yacht?.position.y === bobbed,
    ]).toEqual([false, false, false]);
  });

  it("lifts the hero up the floors and floats them in the hover car", () => {
    expect(liftOf({ floor: 7 })).toBe(7 * storeyHeight);
    expect(liftOf({ elevator: { at: 0, from: 0, to: 21 }, tick: 400 })).toBe(
      21 * storeyHeight,
    );
    expect(liftOf({ ride: "hover", tick: 0 })).toBeCloseTo(hoverHeight);
    expect(liftOf({ ride: "car", tick: 0 })).toBeNull();
  });

  it("parks the hover car on its stand and on the penthouse's pad, and the rooftop's helicopter up on the roof", () => {
    const things = buildThings();
    const stand = things.root.getObjectByName("thing-ride-hover");
    const pad = things.root.getObjectByName("thing-haus-pad");
    const heli = things.root.getObjectByName("thing-haus-heli");
    const stood = spotNamed("ride-hover");
    if (stood === undefined) throw new Error("no stand");
    things.show(day({ x: stood.x, z: stood.z }), null, 1);
    expect([stand?.visible, pad?.visible, heli?.visible]).toEqual([
      false,
      false,
      true,
    ]);
    things.show(
      day({ hover: true, keycard: true, x: stood.x, z: stood.z }),
      null,
      2,
    );
    expect([stand?.visible, pad?.visible]).toEqual([true, true]);
    expect(pad?.position.y).toBeCloseTo(penthouseFloor * storeyHeight + 0.4);
    expect(heli?.position.y).toBe(topFloor * storeyHeight);
    expect(stand?.getObjectByName("neon-pool")).toBeDefined();
  });

  it("stands the concierge in the lobby and the Canopy's host up on the roof", () => {
    const scene = new Scene();
    const people = createPeople(scene, [], []);
    const at = { heading: 0, x: haus.x / 100, y: 0, z: haus.z / 100 };
    people.show(day({ x: haus.x, z: haus.z }), at, 1, 0.1);
    expect(scene.getObjectByName("haus-concierge")?.position.y).toBe(0);
    people.show(
      day({ floor: topFloor, keycard: true, x: haus.x, z: haus.z }),
      at,
      2,
      0.1,
    );
    expect(scene.getObjectByName("haus-dine")?.position.y).toBe(
      topFloor * storeyHeight,
    );
    expect(scene.getObjectByName("haus-lift-0")).toBeUndefined();
  });

  it("floats the hover car under the hero on a pool of its own light", () => {
    const rides = buildRides();
    rides.show("hover", 1, 0.45, 1, 0, 1);
    const hover = rides.root.getObjectByName("hover");
    expect([
      hover?.visible,
      hover?.getObjectByName("neon-pool")?.position.y,
    ]).toEqual([true, -0.4]);
  });
});
