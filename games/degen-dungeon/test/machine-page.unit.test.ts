// @vitest-environment jsdom
import { PerspectiveCamera, type Scene } from "three";
import { describe, expect, it, vi } from "vitest";

import { guideFor } from "../src/guide.ts";
import { noteFor } from "../src/page/hud.ts";
import { goalFor, talkOf } from "../src/page/words.ts";
import { afterDay, freshProgress, nextRun, restore } from "../src/progress.ts";
import { fateDun } from "../src/rules/constants.ts";
import { startDay } from "../src/rules/day.ts";
import { echoAt, recklessOn, statue } from "../src/rules/machine.ts";
import { resultOf } from "../src/screen/result.ts";
import { echoTells, machineLines, wakeLine } from "../src/script/cast.ts";
import type { Stage } from "../src/view/stage.ts";
import { buildStatue } from "../src/view/statue.ts";
import { createWorldView } from "../src/view/world-view.ts";

describe("the Time Machine on the page", () => {
  const day = startDay(1, 7, 1);
  const trip = startDay(1, 7, 1, 1);
  const street = { x: 18_000, z: 17_000 };

  it("opens when the statue takes the hero or the last day ends on SHA Beach, and a trip back starts the story again", () => {
    const entered = afterDay(
      { ...freshProgress, day: 3 },
      { ...day, cause: "machine", day: 3, ended: true },
    ).progress;
    expect([entered.machine, entered.day]).toEqual([true, 3]);
    expect(nextRun(entered)).toEqual({ day: 1, fate: 0, loop: 1 });
    const last = { ...day, cause: "beach", day: 5 } as const;
    expect(afterDay({ ...freshProgress, day: 5 }, last).progress.machine).toBe(
      true,
    );
    expect(
      afterDay(freshProgress, { ...day, cause: "home" }).progress.machine,
    ).toBe(false);
    const back = afterDay(
      { ...entered, fate: -1, loops: 2 },
      { ...trip, cause: "home", ended: true, fate: 4, made: 100 },
    );
    expect(back.progress).toMatchObject({
      best: 100 + 4 * fateDun,
      day: 1,
      fate: 3,
      loops: 3,
      machine: false,
    });
    expect(nextRun(back.progress)).toEqual({ day: 1, fate: 3, loop: 0 });
    expect(nextRun({ ...freshProgress, loops: 40, machine: true })).toEqual({
      day: 1,
      fate: 0,
      loop: 9,
    });
    expect(restore({ fate: -3, loops: 2, machine: true })).toMatchObject({
      fate: -3,
      loops: 2,
      machine: true,
    });
    expect(restore({ fate: 0.5, loops: -1, machine: "yes" })).toMatchObject({
      fate: 0,
      loops: 0,
      machine: false,
    });
  });

  it("says so on the first screen, beside the statue, beside the newbie and on the card after", () => {
    const save = { day: 4, machine: true, slip: false };
    expect(guideFor(7, save).start).toBe("ENTER: TIME MACHINE TO DAY 1");
    expect(guideFor(7, save).touchStart).toBe("TAP: TIME MACHINE TO DAY 1");
    expect(guideFor(7, { ...save, machine: false }).start).toBe(
      "ENTER TO WAKE UP - DAY 4",
    );
    expect(wakeLine(7, 1)).toContain("a newbie you is waking up");
    expect(wakeLine(7, 0)).toContain("liquidated");
    const beside = { ...day, ...statue };
    expect(noteFor(beside)).toBe(machineLines.asleep);
    expect(noteFor({ ...beside, pocket: 100_000 })).toContain(
      "step into the Time Machine",
    );
    expect(noteFor({ ...day, ...street, pocket: 100_000 })).toBe(
      machineLines.risen,
    );
    expect(noteFor(trip)).toBe(machineLines.cooling);
    const echo = echoAt(trip);
    if (echo === null) throw new Error("nobody to meet");
    const met = { ...trip, x: echo.x, z: echo.z };
    expect(noteFor(met)).toContain("talk to your newbie self");
    expect(goalFor({ ...trip, ...street })).toBe(
      "Find your newbie self, waking up outside home.",
    );
    expect(goalFor({ ...trip, done: ["echo-wake"] })).toBe(
      "Bend the timeline, then sleep it off.",
    );
    expect(noteFor({ ...trip, ...street, done: ["echo-wake"] })).toContain(
      "uses what is near",
    );
    expect(talkOf({ ...met, talk: "echo-wake" })?.say).toContain(
      echoTells[recklessOn(trip) ? "reckless" : "careful"],
    );
    expect(talkOf({ ...met, talk: "echo-offer" })?.say).toContain(
      "Warn them off it?",
    );
    const view = { best: 0, newBest: false, phase: "over" };
    const rows = (fate: number): readonly string[] =>
      resultOf(
        { ...trip, cause: "machine", ended: true, fate, made: 1_500 },
        view,
      )?.rows.map(({ text }) => text) ?? [];
    expect(rows(-2).slice(0, 2)).toEqual([
      "INTO THE TIME MACHINE",
      "MADE 500 DUN   TIMELINE -2 DARKER",
    ]);
    expect(rows(3)[1]).toBe("MADE 3000 DUN   TIMELINE +3 BRIGHTER");
    expect(rows(0)[1]).toBe("MADE 1500 DUN   TIMELINE UNCHANGED");
  });

  it("raises the Ice Runner, opens the ring, and shows the newbie only on a trip back", () => {
    const built = buildStatue();
    const runner = built.root.getObjectByName("runner");
    const ring = built.root.getObjectByName("machine");
    const asleep = runner?.position.y ?? 0;
    expect(ring?.visible).toBe(false);
    built.pose(true, 2, 10);
    expect(runner?.position.y ?? 0).toBeGreaterThan(asleep + 3);
    expect([ring?.visible, ring?.rotation.z]).toEqual([true, 2]);

    const draw = vi.fn<(scene: Scene) => void>();
    const stage: Stage = { camera: new PerspectiveCamera(), draw };
    const world = createWorldView(stage);
    world.day(trip, 0, 0.016, false);
    const scene = draw.mock.calls[0]?.[0];
    const echoes = (): readonly { visible: boolean }[] =>
      scene?.children.filter(({ name }) => name === "echo") ?? [];
    expect(scene?.getObjectByName("statue")).toBeDefined();
    expect(echoes().map(({ visible }) => visible)).toEqual([true]);
    const echo = echoAt(trip);
    if (echo === null) throw new Error("nobody to meet");
    const asked = { ...trip, talk: echo.id, x: echo.x, z: echo.z };
    world.day(asked, 0, 1, false);
    const { x, z } = stage.camera.position;
    expect(Math.hypot(x - echo.x / 100 - 1.2, z - echo.z / 100)).toBeLessThan(
      3,
    );
    world.day(startDay(1, 3, 1, 1), 0, 0.016, false);
    expect(echoes()).toHaveLength(1);
    world.day(day, 0, 0.016, false);
    expect(echoes().map(({ visible }) => visible)).toEqual([false]);
  });
});
