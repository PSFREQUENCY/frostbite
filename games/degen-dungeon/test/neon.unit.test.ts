import {
  BoxGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Sprite,
  Vector3,
} from "three";
import { describe, expect, it } from "vitest";

import { spotNamed, spots } from "../src/rules/places.ts";
import type { DayState } from "../src/rules/types.ts";
import { addNeon, beamMap, glowMap, poolMap } from "../src/view/neon.ts";
import { buildThings } from "../src/view/things.ts";
import { buildUnderglow, glowSight } from "../src/view/underglow.ts";
import { buildWallet } from "../src/view/wallet.ts";
import { started } from "./support/replay.ts";

// The strength of a round light at a pixel of its 64-square picture.
const alphaAt = (map: typeof glowMap, x: number, y: number): number => {
  const data = map.image.data;
  return data instanceof Uint8Array ? (data[(y * 64 + x) * 4 + 3] ?? -1) : -1;
};
const sizeOf = (mesh: InstancedMesh, index: number): number => {
  const matrix = new Matrix4();
  mesh.getMatrixAt(index, matrix);
  return new Vector3().setFromMatrixScale(matrix).length();
};

describe("neon", () => {
  it("draws its halo bright in the middle and nothing at the rim or the corners, a pool broad and even, a beam fading upward", () => {
    expect(alphaAt(glowMap, 32, 32)).toBeGreaterThan(240);
    expect(alphaAt(glowMap, 0, 0)).toBe(0);
    expect(alphaAt(glowMap, 0, 32)).toBe(0);
    expect(alphaAt(poolMap, 0, 0)).toBe(0);
    // Halfway out, the pool is still most of its strength; the halo has faded to a quarter.
    expect(alphaAt(poolMap, 48, 32)).toBeGreaterThan(180);
    expect(alphaAt(glowMap, 48, 32)).toBeLessThan(80);
    const beam = beamMap.image.data;
    expect(
      beam instanceof Uint8Array ? [beam[3], beam[31 * 4 + 3]] : [],
    ).toEqual([255, 0]);
  });

  it("wraps each mesh it is asked to in a lit hull the same thickness all round, and adds only the parts asked for", () => {
    const thing = new Group();
    const long = new Mesh(new BoxGeometry(1, 1, 1));
    long.scale.set(2, 0.5, 1);
    const plain = new Mesh(new BoxGeometry(1, 1, 1));
    thing.add(long, plain);
    const neon = addNeon(thing, {
      colour: "#ff3df2",
      edge: 0.1,
      edged: (mesh) => mesh === long,
      halo: 2,
    });
    const hull = long.getObjectByName("neon-edge");
    expect(hull?.scale.toArray().map((n) => Number(n.toFixed(3)))).toEqual([
      1.1, 1.4, 1.2,
    ]);
    expect(plain.getObjectByName("neon-edge")).toBeUndefined();
    expect(neon.root.getObjectByName("neon-halo")).toBeInstanceOf(Sprite);
    expect(
      ["neon-sparkles", "neon-pool", "neon-beam"].map((name) =>
        neon.root.getObjectByName(name),
      ),
    ).toEqual([undefined, undefined, undefined]);
  });

  it("pulses, sparkles circling, and goes dark at no strength", () => {
    const thing = new Group();
    thing.add(new Mesh(new BoxGeometry(1, 1, 1)));
    const neon = addNeon(thing, {
      beam: 3,
      colour: "#39ff14",
      edge: 0.05,
      halo: 1.5,
      pool: [2, 3],
      sparkles: 6,
    });
    const halo = neon.root.getObjectByName("neon-halo");
    const sparkles = neon.root.getObjectByName("neon-sparkles");
    const edge = thing.getObjectByName("neon-edge");
    const beam = neon.root.getObjectByName("neon-beam");
    if (
      !(halo instanceof Sprite) ||
      !(sparkles instanceof InstancedMesh) ||
      !(edge instanceof Mesh) ||
      !(beam instanceof Mesh)
    )
      throw new Error("missing parts");
    neon.show(0);
    const first = [halo.material.opacity, sizeOf(sparkles, 0)];
    neon.show(0.5);
    expect([halo.material.opacity, sizeOf(sparkles, 0)]).not.toEqual(first);
    expect(beam.position.y).toBe(1.5);
    neon.show(1, 0);
    const material: unknown = edge.material;
    expect(material instanceof MeshBasicMaterial ? material.opacity : -1).toBe(
      0,
    );
    expect(halo.material.opacity).toBe(0);
    expect(sizeOf(sparkles, 3)).toBe(0);
  });

  it("lights the dropped wallet from the speech until it is found", () => {
    const wallet = buildWallet();
    const day: DayState = { ...started(1, 4, 1), done: ["speech"] };
    wallet.show(day, 1);
    expect(wallet.root.visible).toBe(true);
    expect(
      ["neon-beam", "neon-halo", "neon-sparkles"].every(
        (name) => wallet.root.getObjectByName(name) !== undefined,
      ),
    ).toBe(true);
    wallet.show({ ...day, done: ["speech", "wallet-found"] }, 2);
    expect(wallet.root.visible).toBe(false);
    wallet.show(null, 3);
    expect(wallet.root.visible).toBe(false);
  });

  it("floats the magnet and the vacuum over their pallets in their own light, and lights a stand's ride under and round its paint", () => {
    const things = buildThings();
    const magnet = spotNamed("tool-magnet");
    const stand = spotNamed("ride-car");
    if (magnet === undefined || stand === undefined)
      throw new Error("missing spots");
    const day: DayState = { ...started(1, 4, 1), x: magnet.x, z: magnet.z };
    const floating = things.root
      .getObjectByName("thing-tool-magnet")
      ?.getObjectByName("floating");
    things.show(day, null, 0);
    const low = floating?.position.y ?? 0;
    things.show(day, null, 0.8);
    expect(floating?.position.y).not.toBe(low);
    expect(floating?.getObjectByName("neon-beam")).toBeDefined();
    const car = things.root.getObjectByName("thing-ride-car");
    expect(car?.getObjectByName("neon-pool")).toBeDefined();
    // Only the painted body is outlined, not the wheels or the lamps.
    const edges: Mesh[] = [];
    car?.traverse((part) => {
      if (part instanceof Mesh && part.name === "neon-edge") edges.push(part);
    });
    expect(edges.length).toBe(1);
  });

  it("lights the road under the rides parked near the hero, brighter after dark, and not under one taken", () => {
    const glow = buildUnderglow();
    const parked = spots.flatMap((spot) =>
      spot.kind === "parked" ? [spot] : [],
    );
    expect(glow.root.count).toBe(parked.length);
    const [first] = parked;
    if (first === undefined) throw new Error("no parked rides");
    const day: DayState = { ...started(1, 4, 1), x: first.x, z: first.z };
    glow.show(day, first.x / 100, first.z / 100, 0, 0);
    expect(sizeOf(glow.root, 0)).toBeGreaterThan(1);
    const dim =
      glow.root.material instanceof MeshBasicMaterial
        ? glow.root.material.opacity
        : 0;
    glow.show(day, first.x / 100, first.z / 100, 0, 1);
    const bright =
      glow.root.material instanceof MeshBasicMaterial
        ? glow.root.material.opacity
        : 0;
    expect(bright).toBeGreaterThan(dim * 2);
    glow.show({ ...day, done: [first.id] }, first.x / 100, first.z / 100, 0, 1);
    expect(sizeOf(glow.root, 0)).toBe(0);
    // A ride far across the island is not drawn.
    glow.show(day, first.x / 100 + glowSight * 3, first.z / 100, 0, 1);
    expect(sizeOf(glow.root, 0)).toBe(0);
  });
});
