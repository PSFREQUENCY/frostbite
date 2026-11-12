// @vitest-environment jsdom
import { defaultSound } from "@frostbite/game-sdk/audio/settings";
import { describe, expect, it, vi } from "vitest";

import {
  attachControls,
  enterZone,
  headingOf,
  steer,
  zoneAt,
  type Mode,
} from "../src/page/controls.ts";
import { element } from "../src/page/elements.ts";
import { listEarned, noteFor, starsText } from "../src/page/hud.ts";
import { afterDay, freshProgress, restore } from "../src/progress.ts";
import { started } from "./support/replay.ts";

const day = started(1, 7, 1);

describe("the words beside the picture", () => {
  it("say what can be done here: an offer to answer, a spot to use, a parcel to carry, or how to play", () => {
    expect(starsText(250)).toBe("★★☆☆☆");
    expect(noteFor({ ...day, talk: "offer-kiki" })).toBe(
      "Bestie, I lost my seed phrase! Will you test my recovery app with yours? Space says yes, X walks away.",
    );
    expect(noteFor({ ...day, talk: "recruit-6" })).toContain(
      "Mint could use a crew. Team up?",
    );
    expect(noteFor({ ...day, talk: "nobody" })).toContain(
      "Someone could use a crew.",
    );
    expect(noteFor(day)).toBe("Space: Rally's place");
    const street = { ...day, x: 18_000, z: 18_000 };
    expect(noteFor({ ...street, parcel: "drop-marina" })).toBe(
      "Carry the parcel to: Yacht club door",
    );
    expect(noteFor({ ...street, parcel: "gone" })).toBe(
      "Carry the parcel to: its door",
    );
    expect(noteFor(street)).toContain("Arrows walk");
  });

  it("list the milestones earned by their titles, and find the page's parts or say which is missing", () => {
    document.body.innerHTML = '<ul id="earned"></ul><p id="note"></p>';
    const list = element("earned", "ul");
    listEarned(list, ["faucet", "payday"], new Map([["faucet", "First DUN"]]));
    expect([...list.children].map((item) => item.textContent)).toEqual([
      "First DUN",
      "payday",
    ]);
    expect(list.querySelector("li")?.dataset.milestone).toBe("faucet");
    expect(() => element("note", "ul")).toThrow("Missing #note");
    expect(() => element("nowhere", "p")).toThrow("Missing #nowhere");
  });
});

describe("what the platform is asked to remember", () => {
  it("is checked field by field when it comes back", () => {
    expect(restore(null)).toEqual(freshProgress);
    expect(restore("best")).toEqual(freshProgress);
    expect(
      restore({
        best: 12,
        day: 3,
        hero: 2,
        seen: true,
        slip: true,
        sound: { effects: false, music: true, volume: 0.5 },
      }),
    ).toEqual({
      best: 12,
      day: 3,
      hero: 2,
      seen: true,
      slip: true,
      sound: { effects: false, music: true, volume: 0.5 },
    });
    expect(
      restore({ best: -1, day: 9, hero: 2.5, seen: "yes", slip: 1, sound: 7 }),
    ).toEqual({ ...freshProgress, sound: defaultSound });
  });

  it("keeps the best day, opens the next story day after a night at home, and unlocks Slip in the airdrop", () => {
    const home = afterDay(freshProgress, { ...day, cause: "home", made: 300 });
    expect([home.newBest, home.progress.best, home.progress.day]).toEqual([
      true,
      300,
      2,
    ]);
    const frozen = afterDay(home.progress, {
      ...day,
      cause: "frozen",
      day: 2,
      made: 100,
    });
    expect([
      frozen.newBest,
      frozen.progress.best,
      frozen.progress.day,
      frozen.progress.slip,
    ]).toEqual([false, 300, 2, false]);
    expect(
      afterDay({ ...freshProgress, day: 5 }, { ...day, cause: "home", day: 5 })
        .progress.day,
    ).toBe(5);
    expect(
      afterDay({ ...freshProgress, day: 3 }, { ...day, cause: "home" }).progress
        .day,
    ).toBe(3);
    expect(
      afterDay(freshProgress, { ...day, day: 3, storm: 40 }).progress.slip,
    ).toBe(true);
  });
});

describe("the player's hands", () => {
  const hands = () => ({
    act: vi.fn<() => void>(),
    lift: vi.fn<(by: number) => void>(),
    move: vi.fn<(dir: number) => void>(),
    no: vi.fn<() => void>(),
    pause: vi.fn<() => void>(),
    start: vi.fn<() => void>(),
    tapStart: vi.fn<() => void>(),
    turn: vi.fn<(by: number) => void>(),
  });
  const press = (code: string, type = "keydown") =>
    window.dispatchEvent(new KeyboardEvent(type, { code }));

  it("turn two held keys into one of eight headings, and a finger on the stick into one of sixteen", () => {
    expect([
      headingOf(0, 0),
      headingOf(1, 0),
      headingOf(1, 1),
      headingOf(0, 1),
      headingOf(-1, 0),
      headingOf(0, -1),
      headingOf(1, -1),
    ]).toEqual([-1, 0, 2, 4, 8, 12, 14]);
    expect(steer({ x: 0.22, y: 0.62 })).toBeNull();
    expect(steer({ x: 0.4, y: 0.62 })).toBe(0);
    expect(steer({ x: 0.22, y: 0.9 })).toBe(4);
    expect(steer({ x: 0.05, y: 0.62 })).toBe(8);
    expect(steer({ x: 0.22, y: 0.2 })).toBe(12);
  });

  it("read the screen as the ring before a day, a stick and an act during one, and no and yes while an offer waits", () => {
    expect([
      zoneAt("waiting", { x: 0.1, y: 0.5 }),
      zoneAt("waiting", { x: 0.5, y: 0.5 }),
      zoneAt("waiting", { x: 0.9, y: 0.5 }),
    ]).toEqual(["prev", "start", "next"]);
    expect([
      zoneAt("asked", { x: 0.2, y: 0.5 }),
      zoneAt("asked", { x: 0.8, y: 0.5 }),
    ]).toEqual(["no", "act"]);
    expect([
      zoneAt("playing", { x: 0.4, y: 0.62 }),
      zoneAt("playing", { x: 0.22, y: 0.62 }),
      zoneAt("playing", { x: 0.8, y: 0.5 }),
    ]).toEqual([0, null, "act"]);
    const hand = hands();
    for (const zone of [6, "prev", "next", "start", "act", "no"] as const)
      enterZone(hand, zone);
    expect(hand.move).toHaveBeenCalledWith(6);
    expect(hand.turn.mock.calls).toEqual([[-1], [1]]);
    expect(
      [hand.tapStart, hand.act, hand.no].map(
        (called) => called.mock.calls.length,
      ),
    ).toEqual([1, 1, 1]);
  });

  it("walk on held keys, act, answer, lift, start and pause, and turn the ring only while waiting", () => {
    const hand = hands();
    let mode: Mode = "waiting";
    const stop = attachControls(document.body, hand, () => mode);
    press("ArrowRight");
    press("KeyA");
    press("ArrowUp");
    expect([hand.turn.mock.calls, hand.move.mock.calls]).toEqual([
      [[1], [-1]],
      [],
    ]);
    for (const code of ["ArrowRight", "KeyA", "ArrowUp"]) press(code, "keyup");
    mode = "playing";
    press("KeyD");
    press("KeyS");
    press("KeyD", "keyup");
    press("KeyS", "keyup");
    expect(hand.move.mock.calls).toEqual([[0], [2], [4], [-1]]);
    for (const code of ["Space", "KeyX", "KeyR", "KeyF", "Enter", "KeyP"])
      press(code);
    press("Space", "keyup");
    expect(
      [hand.act, hand.no, hand.start, hand.pause].map(
        (called) => called.mock.calls.length,
      ),
    ).toEqual([1, 1, 1, 1]);
    expect(hand.lift.mock.calls).toEqual([[1], [-1]]);
    stop();
    press("Space");
    expect(hand.act).toHaveBeenCalledTimes(1);
  });
});
