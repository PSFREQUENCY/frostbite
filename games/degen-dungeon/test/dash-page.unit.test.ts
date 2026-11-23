// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import { packOf } from "../src/page/bag.ts";
import { noteFor } from "../src/page/hud.ts";
import { createToasts } from "../src/page/toasts.ts";
import { clockText, dashLine, goalFor, talkOf } from "../src/page/words.ts";
import { stages } from "../src/rules/course.ts";
import { dashPar } from "../src/rules/dash.ts";
import type { DayState } from "../src/rules/types.ts";
import { dashPack, drivingLine, trialLines } from "../src/script/dash.ts";
import { started } from "./support/replay.ts";

const day = started(3, 4, 2);
const run = (stage: number, more: Partial<DayState> = {}): DayState => ({
  ...day,
  dash: stage,
  dashFrom: 0,
  tick: 900,
  ...more,
});

describe("the Degen Dash on the page", () => {
  it("puts the stage, what it asks and the clock against par in Pip's line during a run", () => {
    expect([
      clockText(0),
      clockText(-30),
      clockText(dashPar),
      clockText(1_830),
    ]).toEqual(["0:00", "0:00", "1:40", "1:01"]);
    expect(dashLine(day)).toBeNull();
    const line = dashLine(run(3));
    expect(line).toBe(
      `Degen Dash 3/${String(stages.length)} · ${trialLines.crawl} · 0:30 (par 1:40)`,
    );
    expect(goalFor(run(3))).toBe(line);
    expect(dashLine(run(7))).toContain(trialLines.car);
    expect(dashLine(run(7, { ride: "car" }))).toContain(drivingLine);
    // A drain is still more urgent than the clock.
    expect(goalFor(run(3, { drain: 1 }))).toContain("draining");
  });

  it("says Miss Mirinda's words, the desk's questions with three answers, and the run's time when it ends", () => {
    expect(talkOf({ ...day, talk: "zuri" })?.answers).toEqual([
      "Buy a ticket, 250",
      "Not today",
    ]);
    for (const quiz of [0, 1, 2, 3])
      expect(
        talkOf({ ...day, talk: `quiz-${String(quiz)}` })?.answers,
      ).toHaveLength(3);
    expect(
      talkOf({ ...day, dashTime: 1_800, talk: "dash-won" })?.say,
    ).toContain("1:00, under par");
    expect(
      talkOf({ ...day, dashTime: 3_600, talk: "dash-done" })?.say,
    ).toContain("Over the line in 2:00. A win needs par (1:40)");
  });

  it("lists the Dash in the backpack: a ticket, a run's stage and clock, the trophy and print or a medal, and the last time", () => {
    const section = (state: DayState): readonly string[] | undefined =>
      Object.fromEntries(packOf(state))["The Degen Dash"];
    expect(section(day)).toBeUndefined();
    expect(section({ ...day, tickets: 1 })).toEqual([dashPack.ticket]);
    expect(section(run(4))).toEqual([
      "Stage 4 of 9, 0:30 on the clock (par 1:40)",
    ]);
    const done = ["dash-finished", "dash-won"];
    expect(section({ ...day, dashTime: 1_800, done })).toEqual([
      dashPack.trophy,
      dashPack.print,
      "Last time over the line: 1:00",
    ]);
    expect(
      section({ ...day, dashTime: 3_600, done: ["dash-finished"] }),
    ).toEqual([dashPack.medal, "Last time over the line: 2:00"]);
  });

  it("says when Miss Mirinda is beside the hero, and cheers a ticket, the start, each gate and the finish", () => {
    const quiet = { ...day, x: 18_000, z: 16_200 };
    expect(noteFor({ ...quiet, zuri: { x: 18_000, z: 16_200 } })).toContain(
      "Miss Mirinda, with a Degen Dash ticket",
    );
    expect(noteFor(quiet)).not.toContain("Miss Mirinda");
    const card = document.createElement("aside");
    const toasts = createToasts(card);
    const cheer = (state: DayState, at: number): string => {
      toasts.show(state, at);
      return card.textContent;
    };
    cheer(day, 0);
    expect(cheer({ ...day, tickets: 1, tick: 30 }, 10)).toContain(
      "TICKET IN HAND",
    );
    expect(cheer(run(1, { tick: 60 }), 20)).toContain("THE DEGEN DASH IS ON");
    expect(cheer(run(2, { tick: 90 }), 30)).toContain("STAGE 1 OF 9 CLEARED");
    expect(
      cheer({ ...day, done: ["dash-finished", "dash-won"], tick: 120 }, 40),
    ).toContain("DEGEN DASH CHAMPION");
  });
});
