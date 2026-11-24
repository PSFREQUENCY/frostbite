import {
  BoxGeometry,
  Group,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
} from "three";
import { describe, expect, it } from "vitest";

import { rooms } from "../src/rules/rooms.ts";
import type { DayState } from "../src/rules/types.ts";
import { onStreet } from "../src/rules/world.ts";
import { buildForecourts, carAt } from "../src/view/forecourts.ts";
import { hallPlans } from "../src/view/insider-plans.ts";
import { placeOf, there } from "../src/view/insider-poses.ts";
import { anchorOf, buildInsiders, people } from "../src/view/insiders.ts";
import { flightHeights, liftOf } from "../src/view/lift.ts";
import { roofAt } from "../src/view/lots.ts";
import { settle } from "../src/view/settle.ts";
import {
  pumpOffset,
  pumpPeriod,
  roomPlace,
  shopPlans,
  streetPlace,
  streetPlans,
} from "../src/view/shop-plans.ts";
import { nextRatio } from "../src/view/stage.ts";
import { venues } from "../src/rules/venues.ts";
import { started } from "./support/replay.ts";

describe("a city that looks alive", () => {
  it("packs the clubs and fills every walk-in shop, the restaurant's tables and the pumps", () => {
    const club = venues.findIndex(({ kind }) => kind === "club");
    expect(
      hallPlans.filter((plan) => plan.place === club && plan.doing === "dance")
        .length,
    ).toBeGreaterThanOrEqual(60);
    for (const [index, room] of rooms.entries())
      if (room.kind !== "loft")
        expect(
          shopPlans.filter((plan) => plan.place === roomPlace(index)).length,
          room.label,
        ).toBeGreaterThan(1);
    const diners = shopPlans.filter(
      (plan) =>
        plan.place ===
          roomPlace(rooms.findIndex(({ kind }) => kind === "restaurant")) &&
        plan.doing === "sit",
    );
    expect(diners).toHaveLength(6);
    // A driver stands by each pump only while a car is there.
    const drivers = shopPlans.filter((plan) => plan.when !== undefined);
    expect(drivers).toHaveLength(
      rooms.filter(({ kind }) => kind === "gas").length * 2,
    );
    const first = drivers[0];
    if (first === undefined) return;
    expect([
      there(first, 10, pumpPeriod),
      there(first, 30, pumpPeriod),
    ]).toEqual([true, false]);
    expect(there({ ...first, when: [30, 6] }, 2, pumpPeriod)).toBe(true);
    expect(there(hallPlans[0] ?? first, 30, pumpPeriod)).toBe(true);
  });

  it("puts skaters and shoppers on the boroughs' middle streets, only where it is street all the way", () => {
    expect(
      streetPlans.filter(({ doing }) => doing === "skate").length,
    ).toBeGreaterThan(8);
    expect(streetPlans.filter(({ bag }) => bag).length).toBeGreaterThan(12);
    for (const plan of streetPlans) {
      expect(onStreet(plan.x * 100, plan.z * 100)).toBe(true);
      expect(onStreet(plan.to[0] * 100, plan.to[1] * 100)).toBe(true);
    }
    const skater = streetPlans.find(({ doing }) => doing === "skate");
    if (skater === undefined) return;
    const rolling = placeOf(skater, 3);
    expect(
      Math.hypot(rolling.x - skater.x, rolling.z - skater.z),
    ).toBeGreaterThan(5);
  });

  it("draws a place's people only while the hero is near it", () => {
    const insiders = buildInsiders();
    const bodies = insiders.root.getObjectByName("insider-bodies");
    const drawn = (): number =>
      bodies instanceof InstancedMesh ? bodies.count : -1;
    const bodega = rooms.findIndex(({ kind }) => kind === "bodega");
    const [x, z, reach] = anchorOf(roomPlace(bodega));
    expect(reach).toBe(40);
    const inside: DayState = { ...started(1, 7, 2), x: x * 100, z: z * 100 };
    insiders.show(inside, null, 1);
    const shoppers = people.filter(
      ({ place }) => place === roomPlace(bodega),
    ).length;
    expect(drawn()).toBeGreaterThanOrEqual(shoppers);
    const [sx, sz] = anchorOf(streetPlace(4));
    insiders.show({ ...inside, x: sx * 100, z: sz * 100 }, null, 2);
    expect(drawn()).toBeGreaterThanOrEqual(
      people.filter(({ place }) => place === streetPlace(4)).length,
    );
    expect(anchorOf(99_999 - 98_000)).toEqual([0, 0, 0]);
    expect(anchorOf(500)).toEqual([0, 0, 0]);
  });

  it("brings cars into the pumps, stands them while they fill up, and takes them away", () => {
    expect(carAt(pumpOffset(0, 0) + 1, pumpOffset(0, 0))).toBeLessThan(-1);
    expect(carAt(10, 0)).toBe(0);
    expect(carAt(30, 0)).toBeGreaterThan(1);
    expect(carAt(34, 0)).toBeNull();
    const forecourts = buildForecourts();
    const station = rooms.find(({ kind }) => kind === "gas");
    const day = {
      ...started(1, 7, 2),
      x: station?.counter.x ?? 0,
      z: station?.counter.z ?? 0,
    };
    forecourts.show(day, 10);
    expect(forecourts.root.getObjectByName("pump-car-0-0")?.visible).toBe(true);
    forecourts.show({ ...day, x: 33_000, z: 33_000 }, 10);
    expect(forecourts.root.getObjectByName("pump-car-0-0")?.visible).toBe(
      false,
    );
    forecourts.show(null, 10);
  });
});

describe("a smooth picture", () => {
  it("joins scenery that shares a material, and leaves named, instanced and held-back meshes apart", () => {
    const root = new Group();
    const paint = new MeshBasicMaterial();
    const box = new BoxGeometry(1, 1, 1);
    for (let index = 0; index < 5; index += 1) {
      const part = new Mesh(box, paint);
      part.position.x = index;
      root.add(part);
    }
    const named = new Mesh(box, paint);
    named.name = "lamp";
    const kept = new Mesh(box, paint);
    root.add(named, kept, new InstancedMesh(box, paint, 3));
    expect(settle(root, (mesh) => mesh === kept)).toEqual([8, 4]);
    expect(root.getObjectByName("lamp")?.matrixAutoUpdate).toBe(true);
    const lone = new Group();
    lone.add(new Mesh(box, paint));
    expect(settle(lone)).toEqual([1, 1]);
  });

  it("draws less sharply while frames are slow and more sharply while they are quick", () => {
    expect(nextRatio(2, 40, 2)).toBe(1.75);
    expect(nextRatio(1, 40, 2)).toBe(1);
    expect(nextRatio(1.5, 8, 2)).toBe(1.75);
    expect(nextRatio(2, 8, 2)).toBe(2);
    expect(nextRatio(1.5, 16, 2)).toBe(1.5);
  });

  it("flies a high flight over the roofs it crosses", () => {
    let roof: readonly [number, number] = [0, 0];
    for (let x = 130; x < 240 && roof[0] === 0; x += 1)
      if ((roofAt(x, 150) ?? 0) > 12) roof = [x, 150];
    const flying = {
      flyHigh: true,
      flyUntil: 400,
      tick: 100,
      x: roof[0] * 100,
      z: roof[1] * 100,
    };
    expect(liftOf(flying)).toBeCloseTo((roofAt(roof[0], roof[1]) ?? 0) + 2.5);
    expect(liftOf({ ...flying, x: 0, z: 0 })).toBe(flightHeights[1]);
  });
});
