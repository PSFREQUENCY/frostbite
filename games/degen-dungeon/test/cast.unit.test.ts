import { Group, type Object3D } from "three";
import { describe, expect, it, vi } from "vitest";

import { heroes } from "../src/rules/heroes.ts";
import {
  buildActor,
  buildCop,
  buildTux,
  buildVest,
  heightOf,
  heroCount,
} from "../src/view/actor.ts";

describe("the cast", () => {
  const turns = (root: Object3D): number[] => {
    const all: number[] = [];
    root.traverse((part) => all.push(part.rotation.x));
    return all;
  };
  it("has a body for every hero, Bit, the tux, the cop and the Vests, which walk, stand and can put on a model", () => {
    expect(heroCount).toBe(heroes.length);
    for (let hero = 0; hero <= heroCount; hero += 1)
      expect(buildActor(hero).root.name).toBe(`hero-${String(hero)}`);
    const giant = buildActor(3);
    giant.move(0, 0.3, 0.016);
    const standing = turns(giant.root);
    giant.move(13, 0.3, 0.016, true);
    expect(turns(giant.root)).not.toEqual(standing);
    expect(heightOf(3)).toBeGreaterThan(heightOf(1));
    expect([
      buildTux().root.name,
      buildCop().root.name,
      buildVest().root.name,
    ]).toEqual(["tux", "cop", "vest"]);
    const update =
      vi.fn<(pace: number, dt: number, cheering: boolean) => void>();
    const model = { root: new Group(), update };
    giant.wear(model);
    giant.wear(model);
    giant.move(5, 1, 0.02, false, true);
    expect(update).toHaveBeenCalledWith(5, 0.02, true);
    expect(giant.root.children.filter((child) => child.visible)).toHaveLength(
      1,
    );
  });
});
