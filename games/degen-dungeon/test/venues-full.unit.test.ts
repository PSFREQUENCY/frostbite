import { InstancedMesh, Matrix4, Vector3 } from "three";
import { describe, expect, it } from "vitest";

import { caveSites } from "../src/rules/caves.ts";
import { rooms } from "../src/rules/rooms.ts";
import type { DayState } from "../src/rules/types.ts";
import { venues } from "../src/rules/venues.ts";
import { bazaarPlans, buildBazaar, stalls } from "../src/view/bazaar.ts";
import { buildDexFloor } from "../src/view/dex-floor.ts";
import { hallPlans, type Plan } from "../src/view/insider-plans.ts";
import { placeOf, poseOf } from "../src/view/insider-poses.ts";
import { buildInsiders, people } from "../src/view/insiders.ts";
import { buildKnocks, goods, pickFor, restFor } from "../src/view/knocks.ts";
import { buildMall, escalators, gallery, shopNames } from "../src/view/mall.ts";
import { started } from "./support/replay.ts";

const placeOfKind = (kind: string): number =>
  venues.findIndex((venue) => venue.kind === kind);
const plan = (more: Partial<Plan>): Plan => ({
  bag: false,
  coat: "#ffffff",
  doing: "stand",
  face: 0,
  pace: 0,
  phase: 0,
  place: 0,
  r: 0,
  rise: 0,
  skin: "#c68642",
  to: [0, 0],
  x: 0,
  y: 0,
  z: 0,
  ...more,
});

describe("the people inside", () => {
  it("fill every hall, the DEX's floor with traders, ADOR on both floors and the bazaar's aisles", () => {
    for (const [index, venue] of venues.entries())
      expect(
        hallPlans.filter(({ place }) => place === index).length,
        venue.label,
      ).toBeGreaterThan(8);
    const dex = hallPlans.filter(({ place }) => place === placeOfKind("bank"));
    expect(dex.filter(({ doing }) => doing === "trade")).toHaveLength(36);
    const ador = hallPlans.filter(
      ({ place }) => place === placeOfKind("store"),
    );
    expect(ador.filter(({ y }) => y > gallery).length).toBeGreaterThan(15);
    expect(ador.filter(({ doing }) => doing === "ride")).toHaveLength(4);
    expect(bazaarPlans.length).toBeGreaterThan(60);
    expect(people.length).toBe(hallPlans.length + bazaarPlans.length);
  });

  it("walk rings and lines, ride escalators up, and stand, trade, sit, dance and skate where they are", () => {
    const ring = plan({ doing: "ring", pace: 1, r: 10 });
    const start = placeOf(ring, 0);
    expect([start.x, start.z]).toEqual([0, 10]);
    expect(placeOf(ring, Math.PI * 10).z).toBeCloseTo(-10);
    const line = plan({ doing: "line", pace: 1, to: [10, 0] });
    expect(placeOf(line, 5).x).toBeCloseTo(5);
    expect(placeOf(line, 15).x).toBeCloseTo(5);
    expect(placeOf(line, 15).face).toBeCloseTo(-Math.PI / 2);
    const ride = plan({ doing: "ride", pace: 1, rise: 5, to: [10, 0] });
    expect([placeOf(ride, 5).y, placeOf(ride, 15).y]).toEqual([2.5, 2.5]);
    const stand = plan({ face: 1, x: 3 });
    expect(placeOf(stand, 9)).toEqual({ face: 1, stride: 0, x: 3, y: 0, z: 0 });
    expect(poseOf(plan({ doing: "trade" }), 0, 0).arms[0]).toBeLessThan(-2);
    expect(poseOf(plan({ doing: "sit" }), 0, 0).sink).toBeGreaterThan(0.3);
    expect(poseOf(plan({ doing: "dance" }), 0, 0.3).bob).toBeGreaterThan(0);
    expect(poseOf(plan({ doing: "skate" }), 0, 0).spread).toBeGreaterThan(1);
    expect(poseOf(plan({ doing: "ride" }), 0, 0).legs).toEqual([0, 0]);
    expect(poseOf(ring, Math.PI / 2, 0).legs[0]).toBeCloseTo(-0.55);
  });

  it("are drawn only near the hero, and cleared from a place the hero has left", () => {
    const insiders = buildInsiders();
    const bodies = insiders.root.getObjectByName("insider-bodies");
    const matrix = new Matrix4();
    const drawn = (index: number): boolean => {
      if (!(bodies instanceof InstancedMesh)) return false;
      bodies.getMatrixAt(index, matrix);
      return new Vector3().setFromMatrixScale(matrix).x > 0;
    };
    const dex = venues.find(({ kind }) => kind === "bank");
    const first = people.findIndex(
      ({ place }) => place === placeOfKind("bank"),
    );
    const inside: DayState = {
      ...started(1, 7, 2),
      x: dex?.middle.x ?? 0,
      z: dex?.middle.z ?? 0,
    };
    insiders.show(inside, null, 1);
    expect(drawn(first)).toBe(true);
    insiders.show({ ...inside, x: 0, z: 0 }, null, 2);
    expect(drawn(first)).toBe(false);
    insiders.show(null, null, 3);
    expect(insiders.root.visible).toBe(false);
  });
});

describe("the landmarks filled", () => {
  it("give the DEX its trading posts, big board, ticker band, balcony, metal detectors and cameras", () => {
    const floor = buildDexFloor();
    expect(floor.root.children.length).toBeGreaterThan(60);
    floor.show(1);
    floor.show(2);
    expect(floor.root.children.some(({ visible }) => !visible)).toBe(true);
  });

  it("give ADOR two floors of shops, a gallery floor and two escalators up to it", () => {
    const mall = buildMall().root;
    expect(shopNames.flat()).toHaveLength(18);
    expect(new Set(shopNames.flat()).size).toBe(18);
    expect(mall.getObjectByName("mall-gallery")?.position.y).toBe(gallery);
    expect(
      mall.children.filter(({ name }) => name === "mall-escalator"),
    ).toHaveLength(escalators.length);
  });

  it("fill the bazaar with stalls, clear of the traders' own and of the main walk", () => {
    expect(stalls.length).toBeGreaterThan(15);
    for (const [x, z] of stalls) {
      expect(z < 52 || z > 68).toBe(true);
      for (const trader of caveSites.filter(({ id }) =>
        id.startsWith("trader-"),
      ))
        expect(
          Math.hypot(trader.x / 100 - x, trader.z / 100 - z),
        ).toBeGreaterThan(6);
    }
    const bazaar = buildBazaar();
    bazaar.show(1);
    expect(bazaar.root.getObjectByName("bazaar-goods")).toBeDefined();
  });
});

describe("a knocked shelf", () => {
  it("drops what the hero brushes past, and a clerk comes to put each thing back", () => {
    const knocks = buildKnocks();
    const shop = rooms.find((room) => room.kind === "bodega");
    const first = goods.findIndex((good) => good.room === shop);
    const good = goods[first];
    expect(good).toBeDefined();
    if (good === undefined || shop === undefined) return;
    const day: DayState = {
      ...started(1, 7, 2),
      dir: 0,
      x: Math.round(good.home.x * 100) + 30,
      z: Math.round(good.home.z * 100),
    };
    let seconds = 0;
    const run = (state: DayState | null, frames: number): void => {
      for (let frame = 0; frame < frames; frame += 1) {
        seconds += 0.05;
        knocks.show(state, seconds, 0.05);
      }
    };
    run(day, 1);
    expect(good.state).toBe("falling");
    run({ ...day, dir: -1 }, 20);
    expect([good.state, good.at.y]).toEqual(["down", good.size.y / 2]);
    const clerk = knocks.root.getObjectByName("stock-clerk");
    expect(clerk?.visible).toBe(false);
    // Out from the back, three trips to the shelf, and back out of sight.
    run({ ...day, dir: -1 }, Math.ceil((restFor + 3 * pickFor) / 0.05) + 360);
    expect(clerk?.visible).toBe(false);
    expect(
      goods.filter((one) => one.room === shop && one.state !== "shelf"),
    ).toEqual([]);
    expect(good.at.equals(good.home)).toBe(true);
  });

  it("is put right at once when the hero walks out, and is left alone by a hero standing still", () => {
    const knocks = buildKnocks();
    const shop = rooms.find((room) => room.kind === "gas");
    const good = goods.find((one) => one.room === shop);
    if (good === undefined) return;
    const day: DayState = {
      ...started(1, 7, 2),
      dir: -1,
      x: Math.round(good.home.x * 100) + 30,
      z: Math.round(good.home.z * 100),
    };
    knocks.show(day, 1, 0.05);
    expect(good.state).toBe("shelf");
    knocks.show({ ...day, dir: 4, gait: 1 }, 1.05, 0.05);
    expect(good.state).toBe("falling");
    knocks.show({ ...day, x: 0, z: 0 }, 1.1, 0.05);
    expect(good.state).toBe("shelf");
    knocks.show(null, 1.2, 0.05);
  });
});
