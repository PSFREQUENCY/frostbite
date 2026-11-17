import { Box3, InstancedMesh, type Object3D } from "three";
import { describe, expect, it } from "vitest";

import { letters, signFace, signThick } from "../src/rules/mountain.ts";
import { hillAt, landAt, terrace } from "../src/view/hill.ts";
import {
  climbAcross,
  climbSeats,
  letterHeight,
  topOf,
} from "../src/view/letters.ts";
import { buildMountain } from "../src/view/mountain.ts";
import { trail } from "../src/view/trail.ts";

const named = (root: Object3D, name: string): Object3D => {
  const found = root.getObjectByName(name);
  if (found === undefined) throw new Error(`no ${name}`);
  return found;
};
const counted = (root: Object3D, name: string): number => {
  const found = named(root, name);
  if (!(found instanceof InstancedMesh)) throw new Error(`${name} is single`);
  return found.count;
};

describe("Mount WAGMI as it looks", () => {
  it("rises from the end of the Floe's middle street to a flat terrace on the ridge, and slopes under the sea round its edge", () => {
    expect(hillAt(358, 60)).toBe(0);
    expect(hillAt(400, 60)).toBeGreaterThan(5);
    expect(hillAt(430, 60)).toBeGreaterThan(hillAt(400, 60));
    expect(terrace).toBeGreaterThan(25);
    for (const z of [38, 60, 82]) expect(hillAt(458, z)).toBeCloseTo(terrace);
    expect(hillAt(180, 180)).toBe(0);
    expect(landAt(433, 130)).toBeLessThan(-2);
    expect(hillAt(433, 130)).toBe(0);
  });

  it("lays a trail from the street up to the terrace, with steps where it is steep and rope on posts along it", () => {
    const first = trail[0];
    const last = trail.at(-1);
    expect(first?.y).toBeCloseTo(0);
    expect(last?.y).toBeCloseTo(terrace, 0);
    const mountain = buildMountain();
    expect(counted(mountain.root, "trail-steps")).toBeGreaterThan(10);
    expect(counted(mountain.root, "trail-posts")).toBeGreaterThan(40);
    expect(counted(mountain.root, "trail-rope")).toBeGreaterThan(40);
    expect(counted(mountain.root, "scrub")).toBeGreaterThan(100);
    expect(counted(mountain.root, "boulders")).toBeGreaterThan(5);
    expect(named(mountain.root, "trailhead-board")).toBeDefined();
  });

  it("stands the five letters on the terrace facing the city, ten metres tall, on a scaffold of planks behind them", () => {
    const mountain = buildMountain();
    for (const letter of letters) {
      const box = new Box3().setFromObject(
        named(mountain.root, `letter-${letter.char}`),
      );
      expect(box.min.x).toBeCloseTo(signFace / 100, 1);
      expect(box.max.x).toBeCloseTo((signFace + signThick) / 100, 1);
      expect(box.min.y).toBeCloseTo(terrace - 0.04, 1);
      expect(box.max.y - box.min.y).toBeCloseTo(letterHeight + 0.08, 1);
      expect(box.min.z).toBeCloseTo(letter.z0 / 100 - 0.04, 1);
      expect(box.max.z).toBeCloseTo(letter.z1 / 100 + 0.04, 1);
    }
    expect(counted(mountain.root, "scaffold")).toBeGreaterThan(100);
    const planks = new Box3().setFromObject(named(mountain.root, "scaffold"));
    expect(planks.min.x).toBeGreaterThan((signFace + signThick) / 100 - 0.1);
  });

  it("knows each letter's top for a sitter, and the stroke a climber follows up to each seat", () => {
    expect(topOf("A", 3.5)).toBeCloseTo(letterHeight);
    expect(topOf("W", 4.5)).toBeCloseTo(7.34);
    expect(topOf("W", 2.55)).toBeCloseTo(3.6);
    expect(topOf("I", 1)).toBeCloseTo(letterHeight);
    expect(topOf("?", 1)).toBe(0);
    expect([...climbSeats].sort()).toEqual(
      letters.flatMap(({ seats }) => seats).sort(),
    );
    // Round the G: from the foot of its curve out to its back and up to the top.
    expect(climbAcross(6_250, 0)).toBeCloseTo(59 + 3.5);
    expect(climbAcross(6_250, letterHeight / 2)).toBeCloseTo(59 + 0.78);
    expect(climbAcross(6_250, letterHeight)).toBeCloseTo(59 + 3.5);
    // Up the A's left leg, and straight up the I.
    expect(climbAcross(5_400, 5.1)).toBeCloseTo(50.5 + 2.15);
    expect(climbAcross(7_875, 3)).toBeCloseTo(77.5 + 1.25);
    expect(climbAcross(1_234, 3)).toBeCloseTo(12.34);
  });
});
