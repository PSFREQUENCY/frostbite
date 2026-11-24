// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { PerspectiveCamera, type Scene } from "three";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { clipFor, createClips } from "../src/page/clips.ts";
import { spotNamed } from "../src/rules/places.ts";
import { rooms } from "../src/rules/rooms.ts";
import { venues } from "../src/rules/venues.ts";
import type { Stage } from "../src/view/stage.ts";
import { clipPose } from "../src/view/clips.ts";
import { createWorldView } from "../src/view/world-view.ts";
import { started } from "./support/replay.ts";

beforeAll(() => {
  const body =
    /<body>([\s\S]*)<\/body>/u.exec(
      readFileSync(join(import.meta.dirname, "../index.html"), "utf8"),
    )?.[1] ?? "";
  document.body.innerHTML = body;
});

const day = started(1, 7, 2);
const club = venues.find(({ kind }) => kind === "club");
const shop = rooms[0];

describe("the cinematic clips", () => {
  it("start a task when the hero first walks into a shop or a landmark today, and finish one when it is done", () => {
    if (club === undefined || shop === undefined) throw new Error("no places");
    const seen = new Set<string>();
    const inside = { ...day, x: club.middle.x, z: club.middle.z };
    expect(clipFor(day, inside, seen)).toMatchObject({
      kind: "crane",
      title: "THE MEMPOOL",
    });
    expect(clipFor(day, inside, seen)).toBeNull();
    expect(
      clipFor(day, { ...day, x: shop.counter.x, z: shop.counter.z }, seen)
        ?.title,
    ).toBe(shop.label.toUpperCase());
    expect(clipFor(day, { ...day, done: ["did-dance"] }, seen)).toMatchObject({
      kind: "spin",
      title: "ON THE FLOOR",
    });
    expect(clipFor(day, { ...day, done: ["car-3"] }, seen)?.title).toBe(
      "JOYRIDE",
    );
    expect(clipFor(day, { ...day, done: ["letter-4"] }, seen)?.title).toBe(
      "A LETTER FROM S",
    );
    expect(clipFor(day, { ...day, done: ["moon"] }, seen)).toMatchObject({
      kind: "sky",
      length: 4,
    });
    expect(clipFor(day, { ...day, done: ["faucet"] }, seen)?.title).toBe(
      spotNamed("faucet")?.label.toUpperCase(),
    );
    expect(clipFor(day, { ...day, done: ["no-such-thing"] }, seen)).toBeNull();
    const flying = { ...day, pocket: 0, shot: 1_000 };
    expect(
      clipFor(flying, { ...flying, pocket: 100_000, shot: 0 }, seen)?.title,
    ).toBe("MOONSHOT");
    expect(clipFor(flying, { ...flying, shot: 0 }, seen)?.title).toBe("RUGGED");
  });

  it("letterbox the screen with a title, hold the day while they play, and skip on a tap, a key or their end", () => {
    const clips = createClips();
    const frame = document.getElementById("clip");
    clips.watch(day, { ...day, done: ["did-film"] });
    expect([
      clips.playing(),
      frame?.hidden,
      document.getElementById("clip-title")?.textContent,
    ]).toEqual([true, false, "THE LATE SHOW"]);
    clips.watch(day, { ...day, done: ["did-vr"] });
    expect(document.getElementById("clip-title")?.textContent).toBe(
      "THE LATE SHOW",
    );
    clips.step(1.3);
    expect(clips.current()).toEqual({ kind: "crane", part: 0.5 });
    clips.step(2);
    expect([clips.playing(), frame?.hidden, clips.current()]).toEqual([
      false,
      true,
      null,
    ]);
    clips.watch(day, { ...day, done: ["did-skate"] });
    frame?.click();
    expect(clips.playing()).toBe(false);
    clips.watch(day, { ...day, done: ["did-read"] });
    clips.skip();
    clips.step(1);
    expect(clips.playing()).toBe(false);
    clips.watch(day, { ...day, done: ["did-read"], ended: true });
    expect(clips.playing()).toBe(false);
    clips.reset();
  });

  it("move the camera round the hero for each kind, and the world view follows a clip while it plays", () => {
    const subject = { heading: 0, x: 10, y: 0, z: 20 };
    for (const kind of ["crane", "orbit", "push", "sky", "spin"] as const) {
      const start = clipPose(kind, subject, 0);
      const end = clipPose(kind, subject, 1);
      expect(start, kind).not.toEqual(end);
    }
    expect(clipPose("sky", subject, 1).look[1]).toBeGreaterThan(30);
    const draw = vi.fn<(scene: Scene) => void>();
    const stage: Stage = { camera: new PerspectiveCamera(), draw };
    const view = createWorldView(stage);
    view.day({ ...day, x: 1_000, z: 2_000 }, 1, 0.016, false, {
      kind: "push",
      part: 1,
    });
    expect(stage.camera.fov).toBeCloseTo(
      clipPose("push", { heading: Math.PI / 2, x: 10, y: 0, z: 20 }, 1).fov,
    );
  });
});
