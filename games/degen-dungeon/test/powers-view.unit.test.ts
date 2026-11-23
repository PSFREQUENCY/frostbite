import { Group, InstancedMesh, Matrix4, Vector3 } from "three";
import { describe, expect, it } from "vitest";

import { flightTicks } from "../src/rules/flight.ts";
import { powers } from "../src/rules/powers.ts";
import type { DayState } from "../src/rules/types.ts";
import { goalFor } from "../src/page/words.ts";
import { flyingLine } from "../src/script/powers.ts";
import { buildBody } from "../src/view/body.ts";
import { flightHeights, liftOf } from "../src/view/lift.ts";
import { heroLooks } from "../src/view/looks.ts";
import { bendStride, bonesOf } from "../src/view/models/bend.ts";
import { clipFor } from "../src/view/models/load.ts";
import { buildPowerFx, lasting } from "../src/view/power-fx.ts";
import { intentFor } from "../src/view/shot.ts";
import { started } from "./support/replay.ts";

const out = (hero: number, more: Partial<DayState> = {}): DayState => ({
  ...started(3, hero, 3),
  tick: 3_000,
  x: 18_000,
  z: 18_400,
  ...more,
});
const drawn = (fx: Group): number => {
  const bits = fx.getObjectByName("power-sparks");
  if (!(bits instanceof InstancedMesh)) return 0;
  const matrix = new Matrix4();
  let count = 0;
  for (let index = 0; index < bits.count; index += 1) {
    bits.getMatrixAt(index, matrix);
    if (new Vector3().setFromMatrixScale(matrix).x > 0) count += 1;
  }
  return count;
};

describe("the dragon in the air", () => {
  it("flies low at the power's first level and higher at each after, in the sky's wide shot, hovering", () => {
    const flying = out(1, { flyUntil: 3_000 + flightTicks, powerAt: 2_990 });
    expect(liftOf(flying)).toBe(flightHeights[0]);
    expect(liftOf({ ...flying, done: ["mastered-a"] })).toBe(flightHeights[1]);
    expect(liftOf({ ...flying, done: ["mastered-a", "mastered-b"] })).toBe(
      flightHeights[2],
    );
    expect(liftOf({ ...flying, flyUntil: 3_000 })).toBeNull();
    expect(intentFor(flying, false)).toBe("sky");
    expect(clipFor("fly", 0, -1, false)).toBe("Hover");
    expect(goalFor(flying)).toBe(flyingLine(10));
  });
});

describe("a power at work", () => {
  it("keeps every power's sparks going a while after it is used, with a glow round the hero", () => {
    for (const [hero, power] of powers.entries()) {
      const fx = buildPowerFx();
      const used = out(hero, { powerAt: 2_985, boostUntil: 3_020 });
      fx.show(used, "#ffffff");
      expect(fx.root.getObjectByName("power-aura")?.visible, power).toBe(true);
      expect(drawn(fx.root), power).toBeGreaterThan(0);
      const later = 2_985 + Math.ceil(lasting[power] * 30) + 30;
      fx.show({ ...used, boostUntil: 0, tick: later }, "#ffffff");
      expect(drawn(fx.root), power).toBe(0);
    }
  });

  it("trails sparks behind the flying dragon, leaves a mound where the miner dug and spins up the gem found", () => {
    const fx = buildPowerFx();
    const flying = out(1, { flyUntil: 4_000, powerAt: 1_000 });
    for (let step = 0; step < 5; step += 1)
      fx.show(
        { ...flying, tick: 3_000 + step, x: 18_000 + step * 30 },
        "#7be36b",
      );
    expect(drawn(fx.root)).toBe(64);
    const dig = buildPowerFx();
    dig.show(out(2, { done: ["gem-2985"], powerAt: 2_985 }), "#c98a4b");
    expect([
      dig.root.getObjectByName("power-mound")?.visible,
      dig.root.getObjectByName("power-gem")?.visible,
    ]).toEqual([true, true]);
    dig.show(null, "#c98a4b");
    expect(dig.root.visible).toBe(false);
  });

  it("puffs where the wizard left as well as where they land", () => {
    const fx = buildPowerFx();
    const before = out(4, { powerAt: -1_000, x: 18_500 });
    fx.show(before, "#c9b6ff");
    fx.show({ ...before, powerAt: 3_000, x: 18_000 }, "#c9b6ff");
    fx.show({ ...before, powerAt: 3_000, tick: 3_010, x: 18_000 }, "#c9b6ff");
    expect(drawn(fx.root)).toBe(64);
  });
});

describe("knees and feet", () => {
  it("bend a four-legged model's knees through its run, and leave a two-legged one's alone", () => {
    const ram = new Group();
    for (const name of [
      "fleg.L",
      "fleg.R",
      "fshin.L",
      "fshin.R",
      "bleg.L",
      "bleg.R",
      "bshin.L",
      "bshin.R",
    ]) {
      const bone = new Group();
      bone.name = name;
      ram.add(bone);
    }
    const bones = bonesOf(ram);
    expect(bones.quadruped).toBe(true);
    bendStride(bones, Math.PI / 2);
    const knee = (name: string): number =>
      ram.getObjectByName(name)?.rotation.x ?? 0;
    expect(knee("bshin.L")).toBeCloseTo(1);
    expect(knee("bshin.R")).toBeCloseTo(0.25);
    const two = new Group();
    const shin = new Group();
    shin.name = "shin.L";
    two.add(shin);
    bendStride(bonesOf(two), Math.PI / 2);
    expect(shin.rotation.x).toBe(0);
  });

  it("give a body built in code feet that stay level and hands at its wrists", () => {
    const look = heroLooks[7];
    if (look === undefined) return;
    const body = buildBody(look);
    const parts = body.root.getObjectsByProperty("type", "Mesh").length;
    body.pose(14, 0.3, false);
    const feet: number[] = [];
    body.root.traverse((part) => {
      if (
        part.type === "Group" &&
        part.children.length === 1 &&
        part.children[0]?.type === "Mesh" &&
        part.rotation.x !== 0
      )
        feet.push(part.rotation.x);
    });
    expect(parts).toBeGreaterThan(10);
    expect(feet.length).toBeGreaterThan(0);
    body.pose(0, 1, false, "pedal");
  });
});
