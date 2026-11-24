import { InstancedMesh, Matrix4, Vector3 } from "three";
import { describe, expect, it } from "vitest";

import {
  bumpFor,
  createBumps,
  lasts,
  moverOf,
  pushOf,
  type Mover,
} from "../src/view/bumps.ts";
import { buildCrowd } from "../src/view/crowd.ts";
import { buildWalkers } from "../src/view/walkers.ts";
import { started } from "./support/replay.ts";

// The hero heading east (0) at the origin, walking, running or driving.
const hero = (more: Partial<Mover> = {}): Mover => ({
  heading: 0,
  riding: false,
  running: false,
  x: 0,
  z: 0,
  ...more,
});

describe("bumping into people", () => {
  it("shoves a person walked into, knocks one down at a run, and leaves alone anyone a step away", () => {
    expect(bumpFor(hero(), 0.5, 0, 1, 3)).toEqual({
      at: 3,
      kind: "shove",
      x: 1,
      z: 0,
    });
    expect(bumpFor(hero({ running: true }), 0, 0.4, 1, 3)?.kind).toBe("fall");
    expect(bumpFor(hero(), 1.2, 0, 1, 3)).toBeNull();
    // Right on top of them, they go the way the hero faces.
    expect(bumpFor(hero({ heading: Math.PI / 2 }), 0, 0, 1, 0)?.z).toBeCloseTo(
      1,
    );
  });

  it("sees most people hop sideways clear of a ride and the rest knocked over, each by their own luck", () => {
    const kinds = Array.from(
      { length: 200 },
      (_, index) =>
        bumpFor(hero({ riding: true }), 2, 0.5, index, 0)?.kind ?? "none",
    );
    const dodged = kinds.filter((kind) => kind === "dodge").length;
    expect(dodged).toBeGreaterThan(110);
    expect(dodged).toBeLessThan(170);
    expect(kinds.filter((kind) => kind === "fall").length).toBe(200 - dodged);
    // A dodge is sideways, away from the ride's line: south of an eastbound ride goes further south.
    const dodge = Array.from({ length: 50 }, (_, index) =>
      bumpFor(hero({ riding: true }), 2, 0.5, index, 0),
    ).find((bump) => bump?.kind === "dodge");
    expect([dodge?.x, dodge?.z]).toEqual([-0, 1]);
    const north = Array.from({ length: 50 }, (_, index) =>
      bumpFor(hero({ riding: true }), 2, -0.5, index, 0),
    ).find((bump) => bump?.kind === "dodge");
    expect(north?.z).toBe(-1);
    expect(bumpFor(hero({ riding: true }), 4, 0, 1, 0)).toBeNull();
  });

  it("plays each reaction out and back: a stagger, a hop clear, and a fall that lies a moment and gets up", () => {
    const shove = { at: 0, kind: "shove", x: 1, z: 0 } as const;
    expect(pushOf(shove, 0.3)?.x).toBeGreaterThan(0.4);
    expect(pushOf(shove, -1)).toBeNull();
    expect(pushOf(shove, lasts.shove)).toBeNull();
    const dodge = { at: 0, kind: "dodge", x: 0, z: 1 } as const;
    expect(pushOf(dodge, 0.2)?.lift).toBeGreaterThan(0.3);
    expect(pushOf(dodge, 0.6)?.z).toBeCloseTo(1.9);
    expect(pushOf(dodge, 1.35)?.z).toBeLessThan(0.2);
    const fall = { at: 0, kind: "fall", x: 1, z: 0 } as const;
    expect(pushOf(fall, 1)?.lean).toBeCloseTo(Math.PI / 2 - 0.1);
    expect(pushOf(fall, 0.1)?.lean ?? 9).toBeLessThan(1);
    expect(pushOf(fall, 2.7)?.lean ?? 9).toBeLessThan(0.2);
  });

  it("keeps each person's reaction going, then a moment's calm before the next", () => {
    const placed = createBumps(2);
    const near = hero();
    expect(placed(0, 3, 0, 0, near)).toEqual({
      lift: 0,
      tip: null,
      x: 3,
      z: 0,
    });
    const hit = placed(0, 0.5, 0, 1, near);
    expect(hit.tip?.x).toBe(1);
    expect(hit.x).toBeGreaterThanOrEqual(0.5);
    // Still staggering though the hero has gone, then calm, and bumped again once the calm is over.
    expect(placed(0, 0.5, 0, 1.5, null).tip).not.toBeNull();
    expect(placed(0, 0.5, 0, 2.2, near).tip).toBeNull();
    expect(placed(0, 0.5, 0, 2.5, near).tip).not.toBeNull();
    expect(placed(1, 9, 9, 3, near).tip).toBeNull();
  });

  it("feels the hero only on the ground, and the street's walkers and crowds take a hero without fuss", () => {
    const day = started(1, 7, 1);
    expect(moverOf(day, 1, 2, 0)).toEqual({
      heading: 0,
      riding: false,
      running: false,
      x: 1,
      z: 2,
    });
    expect(moverOf({ ...day, dir: 4, gait: 1 }, 1, 2, 0)?.running).toBe(true);
    expect(moverOf({ ...day, ride: "car" }, 1, 2, 0)?.riding).toBe(true);
    for (const off of [
      { level: 1 },
      { ride: "boat" as const },
      { level: 1, ride: "heli" as const },
      { ride: "saucer" as const },
    ])
      expect(moverOf({ ...day, ...off }, 1, 2, 0)).toBeNull();
    // Where the first of a mesh's people stands, and how upright they are (1 standing, 0 lying flat).
    const first = (mesh: InstancedMesh | undefined) => {
      const matrix = new Matrix4();
      mesh?.getMatrixAt(0, matrix);
      const up = new Vector3(0, 1, 0).transformDirection(matrix);
      return { at: new Vector3().setFromMatrixPosition(matrix), up: up.y };
    };
    const meshOf = (
      root: { getObjectByName: (name: string) => unknown },
      name: string,
    ) => {
      const found = root.getObjectByName(name);
      return found instanceof InstancedMesh ? found : undefined;
    };
    const walkers = buildWalkers();
    walkers.show(1, 1, null);
    const torsos = meshOf(walkers.root, "walker-torsos");
    const before = first(torsos);
    expect(before.up).toBeCloseTo(1);
    // Run into the first walker: a moment later they lie on the pavement, and after a while they are up again.
    walkers.show(
      1,
      1,
      hero({ running: true, x: before.at.x - 0.2, z: before.at.z }),
    );
    walkers.show(2, 1, null);
    expect(first(torsos).up).toBeLessThan(0.3);
    walkers.show(9, 1, null);
    expect(first(torsos).up).toBeCloseTo(1);
    const crowd = buildCrowd();
    crowd.show("riot", 1, null);
    const bodies = meshOf(crowd.root, "crowd-bodies");
    const standing = first(bodies);
    crowd.show(
      "riot",
      1,
      hero({ running: true, x: standing.at.x, z: standing.at.z - 0.2 }),
    );
    crowd.show("riot", 2, null);
    expect(first(bodies).up).toBeLessThan(0.3);
  });
});
