// @vitest-environment jsdom
import { createPause, pauseCopy } from "@frostbite/game-sdk/pause";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { roofLevel } from "../src/rules/climb.ts";
import { milestoneIds } from "../src/rules/milestones.ts";
import { signFace } from "../src/rules/mountain.ts";
import { createBadges, flyMs, revealMs } from "../src/page/badges.ts";
import { emblems, markOf } from "../src/page/emblems.ts";
import { notePauses, noteFor } from "../src/page/hud.ts";
import { started } from "./support/replay.ts";

const stageOf = (): HTMLElement => {
  document.body.replaceChildren();
  const stage = document.createElement("div");
  stage.id = "stage";
  document.body.append(stage);
  return stage;
};
const text = (root: ParentNode, selector: string): string =>
  root.querySelector(selector)?.textContent ?? "";

describe("a badge earned", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("lands a medallion in the middle of the picture, with its emblem, glitter, confetti and its name, then flies it to the tray", () => {
    const stage = stageOf();
    const badges = createBadges(stage, milestoneIds.length);
    badges.collect(["seed-paper", "first-gig"]);
    const tray = stage.querySelector("#badges");
    expect(text(stage, ".badges-count")).toBe("2");
    expect(text(stage, ".badges-of")).toBe("/40");
    badges.earn("sub-zero", "Sub-Zero");
    // A second badge waits its turn.
    badges.earn("seed-paper", "Write it down");
    const reveals = stage.querySelectorAll(".reveal");
    expect(reveals.length).toBe(1);
    const reveal = reveals[0];
    if (reveal === undefined) throw new Error("no reveal");
    expect(reveal.getAttribute("role")).toBe("status");
    expect(
      reveal.querySelector(".medal")?.classList.contains("medal-ice"),
    ).toBe(true);
    expect([
      text(reveal, ".reveal-kicker"),
      text(reveal, ".reveal-title"),
      text(reveal, ".reveal-count"),
    ]).toEqual(["New badge", "Sub-Zero", "3 of 40 collected"]);
    expect(reveal.querySelectorAll(".confetto").length).toBe(64);
    expect(reveal.querySelectorAll(".medal-glint").length).toBe(14);
    expect(reveal.querySelectorAll(".medal-rim").length).toBe(8);
    // The snowflake is drawn in strokes, on both faces.
    const paths = reveal.querySelectorAll("path");
    expect(paths.length).toBe(2);
    expect(paths[0]?.getAttribute("stroke")).toBe("currentColor");
    const bit = reveal.querySelector<HTMLElement>(".confetto");
    expect(bit?.style.getPropertyValue("--dx")).toMatch(/cqi$/u);
    vi.advanceTimersByTime(flyMs);
    expect(reveal.classList.contains("fly")).toBe(true);
    expect((reveal as HTMLElement).style.getPropertyValue("--fly-x")).toMatch(
      /px$/u,
    );
    expect(text(stage, ".badges-count")).toBe("2");
    vi.advanceTimersByTime(revealMs - flyMs);
    // Into the tray: counted, and the tray bumps; the badge already collected comes next, earned again.
    expect(text(stage, ".badges-count")).toBe("3");
    expect(tray?.classList.contains("bump")).toBe(true);
    const again = stage.querySelector(".reveal");
    expect([
      text(again ?? stage, ".reveal-kicker"),
      text(again ?? stage, ".reveal-count"),
    ]).toEqual(["Badge earned", "3 of 40 collected"]);
    expect(again?.querySelector("path")?.getAttribute("fill")).toBe(
      "currentColor",
    );
    vi.advanceTimersByTime(700);
    expect(tray?.classList.contains("bump")).toBe(false);
    vi.advanceTimersByTime(revealMs);
    expect(stage.querySelectorAll(".reveal").length).toBe(0);
    badges.collect(["based"]);
    expect(text(stage, ".badges-count")).toBe("4");
  });

  it("strikes every badge in a metal with an emblem of its own kind, and anything else as a gold star", () => {
    for (const id of milestoneIds) {
      const [emblem, metal] = markOf(id);
      expect(emblem.d.length, id).toBeGreaterThan(10);
      expect(["gold", "ice", "iris", "silver"]).toContain(metal);
    }
    expect(markOf("butterfly-effect")).toEqual([emblems.butterfly, "iris"]);
    expect(markOf("somebody-else")).toEqual([emblems.star, "gold"]);
    const used = new Set(milestoneIds.map((id) => markOf(id)[0]));
    expect(used.size).toBeGreaterThan(15);
  });
});

describe("the notes for the new things", () => {
  it("say the lookout is the place for a screenshot, and how to fire the freeze ray", () => {
    const day = started(3, 7, 2);
    const sitting = {
      ...day,
      level: roofLevel,
      x: signFace + 40,
      z: 6_250,
    };
    expect(noteFor(sitting)).toContain("WAGMI sign");
    expect(noteFor(sitting)).toContain("screenshot");
    const quiet = { ...day, x: 18_000, z: 16_200 };
    expect(noteFor({ ...quiet, form: 0, gun: true })).toContain("freeze ray");
    expect(noteFor(quiet)).not.toContain("freeze ray");
  });

  it("hold the note while paused and bring it back after", () => {
    const pause = createPause();
    const note = document.createElement("p");
    const button = document.createElement("button");
    note.textContent = "Walk to the deli.";
    notePauses(pause, note, button);
    pause.set(true);
    expect([note.textContent, button.textContent]).toEqual([
      pauseCopy.paused,
      pauseCopy.resume,
    ]);
    pause.set(false);
    expect([note.textContent, button.textContent]).toEqual([
      "Walk to the deli.",
      pauseCopy.pause,
    ]);
  });
});
