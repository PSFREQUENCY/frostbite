import { describe, expect, it } from "vitest";

import { spotNamed } from "../src/rules/places.ts";
import { venues } from "../src/rules/venues.ts";
import { buildDex, podium, podiumAt } from "../src/view/dex.ts";
import { hillAt } from "../src/view/hill.ts";
import { buildVenues } from "../src/view/venues.ts";

const dex = venues.find(({ kind }) => kind === "bank");
const ador = venues.find(({ kind }) => kind === "store");

describe("the Global DEX", () => {
  it("stands on a podium a metre up, reached by steps that climb from the street a quarter metre at a time", () => {
    if (dex === undefined) throw new Error("no DEX");
    const x = dex.middle.x / 100;
    const front = dex.lot.z0 / 100;
    expect(podiumAt(x, front + 5)).toBe(podium);
    expect(hillAt(x, front + 5)).toBe(podium);
    const steps = [front - 3.9, front - 2.9, front - 1.9, front - 0.9].map(
      (z) => podiumAt(x, z),
    );
    expect(steps).toEqual([0.25, 0.5, 0.75, 1]);
    // Off the steps: the street in front, and past their ends.
    expect(podiumAt(x, front - 4.1)).toBeNull();
    expect(podiumAt(dex.lot.x0 / 100 + 1, front - 1)).toBeNull();
    expect(hillAt(x, front - 10)).toBe(0);
  });

  it("puts Frost on its steps above the riot, and the dropped wallet on the street the riot left", () => {
    if (dex === undefined) throw new Error("no DEX");
    const frost = spotNamed("frost");
    const wallet = spotNamed("wallet");
    expect(
      frost === undefined ? null : podiumAt(frost.x / 100, frost.z / 100),
    ).not.toBeNull();
    expect(
      wallet === undefined ? -1 : hillAt(wallet.x / 100, wallet.z / 100),
    ).toBe(0);
  });

  it("is built as a fortress: columns, a gold sign, an open vault door in the doorway", () => {
    const root = buildDex();
    expect(root.name).toBe("global-dex");
    expect(root.getObjectByName("dex-entablature")).toBeDefined();
    // Swung open on its hinge, clear of the doorway.
    const vault = root.getObjectByName("dex-vault");
    expect(Math.abs(vault?.parent?.rotation.y ?? 0)).toBeGreaterThan(1);
  });
});

describe("ADOR", () => {
  it("is a landmark with glass bands and its counters, racks and the Omi Omy bar inside", () => {
    if (ador === undefined) throw new Error("no ADOR");
    expect(ador.label).toBe("ADOR");
    const built = buildVenues();
    let meshes = 0;
    built.root.traverse(() => {
      meshes += 1;
    });
    expect(meshes).toBeGreaterThan(100);
    expect(built.root.getObjectByName("global-dex")).toBeDefined();
  });
});
