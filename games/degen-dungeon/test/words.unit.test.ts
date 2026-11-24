// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import { noteFor } from "../src/page/hud.ts";
import { createPanel } from "../src/page/panel.ts";
import { canTell, goalFor, questLineOf, talkOf } from "../src/page/words.ts";
import { watcherAt } from "../src/rules/mystery.ts";
import { tunnelMouth } from "../src/rules/story.ts";
import { dayWakes, wakeLine, wakeUps } from "../src/script/cast.ts";
import { dreams, finale } from "../src/script/dreams.ts";
import { questLines, tunnelLine } from "../src/script/lines.ts";
import { stories } from "../src/script/stories.ts";
import { started } from "./support/replay.ts";

const page = readFileSync(join(process.cwd(), "index.html"), "utf8");

describe("Pip's line", () => {
  it("follows the day: the urgent first, then the tunnel, a trip back, and which of today's three quests the hero is on", () => {
    const day = started(2, 7, 3);
    expect(goalFor(day)).toBe(`1/3 · ${stories[7]?.[0]?.[0]?.line ?? ""}`);
    expect(goalFor({ ...day, beat: 2 })).toBe(
      `3/3 · ${stories[7]?.[0]?.[2]?.line ?? ""}`,
    );
    expect(goalFor({ ...day, beat: 3 })).toContain("story is told");
    expect(goalFor({ ...day, fake: true })).toContain("hideout terminal");
    expect(goalFor({ ...day, gate: 1 })).toContain("oldest tunnel");
    const night = started(2, 6, 6);
    const finished = { ...night, beat: 1, done: ["dash-finished"] };
    expect([
      goalFor(night),
      goalFor({ ...night, beat: 1 }),
      goalFor(finished),
    ]).toEqual([
      `1/3 · ${dreams[6]?.line ?? ""}`,
      `2/3 · ${questLines.dash ?? ""}`,
      `3/3 · ${finale.party}`,
    ]);
    const last = started(2, 6, 7);
    expect([
      goalFor(last),
      goalFor({ ...last, crew: [0, 1] }),
      questLineOf(last, "beach"),
    ]).toEqual([
      `1/3 · ${questLines.crew ?? ""}`,
      `2/3 · ${finale.genesis}`,
      tunnelLine,
    ]);
    const trip = started(2, 6, 1);
    expect(goalFor({ ...trip, loop: 1 })).toContain("Find your newbie self");
    expect(goalFor({ ...trip, done: ["speech"] })).toBe(
      `2/3 · ${questLines.wallet ?? ""}`,
    );
    expect(
      goalFor({ ...trip, done: ["speech", "wallet-returned"], paper: 1 }),
    ).toBe(`3/3 · ${questLines.home ?? ""}`);
    expect(goalFor(started(2, 6, 2))).toBe(`1/3 · ${questLines.gig ?? ""}`);
  });

  it("puts a beat's question and its two answers, or the dream's, in the talk", () => {
    const asked = { ...started(2, 3, 5), beat: 1, talk: "beat" };
    expect(talkOf(asked)?.answers).toEqual(stories[3]?.[2]?.[1]?.answers);
    expect(talkOf({ ...asked, beat: 0 })).toBeNull();
    const dream = { ...started(2, 0, 6), talk: "beat" };
    expect(talkOf(dream)).toEqual({
      answers: dreams[0]?.answers,
      say: dreams[0]?.line,
    });
    expect(talkOf({ ...dream, hero: 12 })).toBeNull();
    const smart = started(2, 2, 3);
    expect([
      canTell(smart),
      canTell(started(2, 7, 3)),
      canTell({ ...smart, hero: 7, spotted: 2 }),
    ]).toEqual([true, false, true]);
    expect(talkOf({ ...smart, talk: "offer-scruff" })?.say).not.toContain(
      "Red flag",
    );
  });

  it("says what is near: the watcher's footprints by frost vision, a beat in reach, and the island's wake-up lines", () => {
    const day = started(2, 7, 5);
    const watcher = watcherAt(2, 5);
    expect(noteFor({ ...day, ...watcher, looking: true })).toContain(
      "footprints",
    );
    expect(
      noteFor({ ...day, ...watcher, done: ["watcher"], looking: true }),
    ).not.toContain("footprints");
    const tunnel = { ...day, ...tunnelMouth, gate: 1 };
    expect(noteFor(tunnel)).toContain("Arrows walk");
    expect(wakeLine(3, 0, 1)).toBe(wakeUps[3]);
    expect(wakeLine(3, 0, 3)).toBe(dayWakes[2]);
    expect(dayWakes).toHaveLength(7);
    expect(wakeLine(3, 0, 9)).toBe("");
    expect(wakeLine(30, 0)).toBe("");
  });
});

describe("the panel", () => {
  it("shows the readouts, Pip's line, frost vision's seconds, the helicopter's buttons and the talk with an answer button for each", () => {
    document.body.innerHTML = page.slice(
      page.indexOf("<body>") + 6,
      page.indexOf("</body>"),
    );
    const answer = vi.fn<(choice: number) => void>();
    const panel = createPanel({ answer });
    const text = (id: string) => document.getElementById(id)?.textContent;
    panel.render(null, 70);
    expect([text("best"), text("score"), text("rank"), text("mood")]).toEqual([
      "70",
      "0",
      "Newbie",
      "GM",
    ]);
    expect(document.getElementById("talk")?.hidden).toBe(true);
    const day = { ...started(2, 7, 5), heat: 120, talk: "home" };
    panel.render(day, 70);
    expect([text("score"), text("rank"), text("heat"), text("fomo")]).toEqual([
      "3000",
      "Crab",
      "★☆☆☆☆",
      "0",
    ]);
    expect(text("goal")).toBe(goalFor(day));
    expect(text("look")).toBe("Frost vision, 15s");
    expect(document.getElementById("up")?.hasAttribute("disabled")).toBe(true);
    const buttons = [
      ...document.querySelectorAll<HTMLButtonElement>("#answers button"),
    ];
    expect(buttons.map((button) => button.textContent)).toEqual([
      "1. Sleep",
      "2. Down to the hideout",
      "3. Not yet",
    ]);
    buttons[1]?.click();
    expect(answer).toHaveBeenCalledWith(1);
    panel.render(day, 70);
    expect(document.querySelectorAll("#answers button")).toHaveLength(3);
    panel.render(
      { ...day, looking: true, ride: "heli", talk: null, vision: 0 },
      70,
    );
    expect([
      text("look"),
      document.getElementById("up")?.hasAttribute("disabled"),
    ]).toEqual(["Vision on, 0s", false]);
    expect(document.getElementById("talk")?.hidden).toBe(true);
    expect(panel.answers(day)).toBe(3);
    expect(panel.answers({ ...day, talk: "offer-kiki" })).toBe(2);
  });
});
