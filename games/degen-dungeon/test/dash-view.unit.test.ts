import { InstancedMesh, Matrix4, Scene, Vector3, type Object3D } from "three";
import { describe, expect, it } from "vitest";

import { dashArch, dashDesk } from "../src/rules/course.ts";
import { dashPar } from "../src/rules/dash.ts";
import type { DayState } from "../src/rules/types.ts";
import type { Subject } from "../src/view/camera.ts";
import { metres } from "../src/view/city.ts";
import { gatheringOf } from "../src/view/crowd.ts";
import { buildCourse } from "../src/view/dash-course.ts";
import { createDashView } from "../src/view/dash-view.ts";
import { buildParade, paradeOn, paradeTicks } from "../src/view/parade.ts";
import { buildZuri, hawkCoils } from "../src/view/zuri.ts";
import { started } from "./support/replay.ts";

const day = started(3, 4, 2);
const near = (x: number, z: number): Subject => ({ heading: 0, x, y: 0, z });
const named = (root: Object3D, name: string): Object3D => {
  const found = root.getObjectByName(name);
  if (found === undefined) throw new Error(`no ${name}`);
  return found;
};
const won: DayState = {
  ...day,
  dashFrom: 1_000,
  dashTime: dashPar - 300,
  done: ["dash-finished", "dash-won"],
  tick: 1_010,
};

describe("the Degen Dash in the city", () => {
  it("dresses Miss Mirinda: a ridge of coils from brow to nape, the two-piece, gold, and a ticket in her hand", () => {
    const zuri = buildZuri();
    const hawk = named(zuri.root, "afro-hawk");
    if (!(hawk instanceof InstancedMesh)) throw new Error("no coils");
    expect(hawk.count).toBe(hawkCoils);
    const spread = { x: 0, y: 0, z: 0 };
    const matrix = new Matrix4();
    const at = new Vector3();
    for (let index = 0; index < hawk.count; index += 1) {
      hawk.getMatrixAt(index, matrix);
      at.setFromMatrixPosition(matrix);
      spread.x = Math.max(spread.x, Math.abs(at.x));
      spread.y = Math.max(spread.y, at.y);
      spread.z = Math.max(spread.z, Math.abs(at.z));
    }
    // Narrow across, long front to back, and tall over the head.
    expect(spread.x).toBeLessThan(spread.z / 2);
    expect(spread.y).toBeGreaterThan(0.2);
    expect(named(zuri.root, "gold-ticket")).toBeDefined();
    expect(() => zuri.pose(7, 1, true)).not.toThrow();
  });

  it("stands Miss Mirinda by her arch from the second day, at her desk on a run, and walks her up to a hero she has a ticket for", () => {
    const scene = new Scene();
    const view = createDashView(scene);
    const zuri = named(scene, "zuri");
    const archAt = near(metres(dashArch.x), metres(dashArch.z));
    view.show({ ...started(3, 4, 1), ...dashArch }, archAt, 1, 1 / 30);
    expect([zuri.visible, named(scene, "dash-arch").visible]).toEqual([
      false,
      false,
    ]);
    view.show(day, archAt, 1, 1 / 30);
    expect([zuri.visible, named(scene, "dash-arch").visible]).toEqual([
      true,
      true,
    ]);
    expect(
      zuri.position.distanceTo(new Vector3(archAt.x, 0, archAt.z)),
    ).toBeLessThan(6);
    for (let frame = 0; frame < 20; frame += 1)
      view.show({ ...day, dash: 3 }, archAt, 2 + frame / 2, 0.5);
    expect(
      zuri.position.distanceTo(
        new Vector3(metres(dashDesk.x) - 1.1, 0, metres(dashDesk.z)),
      ),
    ).toBeLessThan(0.1);
    // A walk-up: she starts back along the way the hero came and strolls up beside them.
    const hero = near(180, 162);
    const waiting = { ...day, zuri: { x: 18_000, z: 16_200 } };
    view.show(waiting, hero, 20, 1 / 30);
    expect(
      Math.hypot(zuri.position.x - 180, zuri.position.z - 162),
    ).toBeGreaterThan(5);
    for (let frame = 0; frame < 10; frame += 1)
      view.show(waiting, hero, 21 + frame / 2, 0.5);
    expect(
      Math.hypot(zuri.position.x - 180, zuri.position.z - 162),
    ).toBeLessThan(2);
    view.hide();
    expect([zuri.visible, named(scene, "degen-dash").visible]).toEqual([
      false,
      false,
    ]);
  });

  it("shows the course on a run: the gates still to clear, a ring at the next, the mark only in frost vision, the Dash car until it is taken", () => {
    const course = buildCourse();
    const gate = (name: string): Object3D =>
      named(course.root, `dash-gate-${name}`);
    const ring = (name: string): boolean =>
      named(gate(name), "next-gate").visible;
    course.show(day, 1);
    expect([
      gate("run").visible,
      named(course.root, "dash-car").visible,
    ]).toEqual([false, false]);
    course.show({ ...day, dash: 3 }, 1);
    expect([
      gate("duck").visible,
      gate("crawl").visible,
      gate("wall").visible,
    ]).toEqual([false, true, true]);
    expect([ring("crawl"), ring("wall")]).toEqual([true, false]);
    course.show({ ...day, dash: 6 }, 1);
    expect(named(gate("look"), "dash-mark").visible).toBe(false);
    course.show({ ...day, dash: 6, looking: true }, 1);
    expect(named(gate("look"), "dash-mark").visible).toBe(true);
    expect(named(course.root, "dash-car").visible).toBe(true);
    course.show({ ...day, dash: 7, ride: "car" }, 1);
    expect(named(course.root, "dash-car").visible).toBe(false);
    course.show({ ...day, dash: 8 }, 1);
    expect(named(course.root, "dash-car").visible).toBe(false);
  });

  it("throws a parade for half a minute after a win: confetti, fireworks, the trophy over the champion and the crowd cheering", () => {
    expect([paradeOn(won), gatheringOf(won)]).toEqual([true, "parade"]);
    expect(paradeOn({ ...won, tick: won.dashFrom + paradeTicks })).toBe(false);
    expect(paradeOn({ ...won, dashTime: dashPar + 1 })).toBe(false);
    expect(paradeOn({ ...won, dash: 1 })).toBe(false);
    const parade = buildParade();
    const champion = near(180, 173);
    parade.show(won, { ...champion, y: 1 }, 5);
    expect(parade.root.visible).toBe(true);
    expect(named(parade.root, "trophy").position.y).toBeGreaterThan(3.3);
    parade.show(won, champion, 9);
    parade.show(day, champion, 10);
    expect(parade.root.visible).toBe(false);
  });
});
