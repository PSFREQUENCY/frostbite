// @vitest-environment jsdom
import { defaultSound } from "@frostbite/game-sdk/audio/settings";
import { describe, expect, it, vi } from "vitest";

import {
  attachControls,
  enterZone,
  headingOf,
  zoneAt,
  type Mode,
} from "../src/page/controls.ts";
import { element } from "../src/page/elements.ts";
import { wayOf } from "../src/page/stick.ts";
import { listEarned, noteFor, starsText } from "../src/page/hud.ts";
import { goalFor, talkOf } from "../src/page/words.ts";
import { afterDay, freshProgress, restore } from "../src/progress.ts";
import { started } from "./support/replay.ts";

const day = started(1, 7, 1);

describe("the words beside the picture", () => {
  it("say what can be done here: an offer to answer, a spot to use, a parcel to carry, or how to play", () => {
    expect(starsText(250)).toBe("★★☆☆☆");
    expect(noteFor({ ...day, talk: "offer-kiki" })).toBe(
      "E or 1 to 5 answers, X walks away.",
    );
    expect(talkOf({ ...day, talk: "offer-kiki" })).toEqual({
      answers: ["Yes", "Walk away"],
      say: "Bestie, I lost my seed phrase! Will you test my recovery app with yours?",
    });
    expect(
      talkOf({ ...day, looking: true, talk: "offer-kiki" })?.say,
    ).toContain("Red flag: she wants your words.");
    expect(talkOf({ ...day, talk: "recruit-6" })?.say).toBe(
      "Mint could use a crew. Team up?",
    );
    expect(talkOf({ ...day, talk: "nobody" })?.say).toBe(
      "Someone could use a crew. Team up?",
    );
    expect(talkOf({ ...day, talk: "chart" })?.say).toMatch(
      /The coin is at \d+ DUN/,
    );
    expect(talkOf({ ...day, talk: "home" })?.answers).toHaveLength(3);
    expect(talkOf(day)).toBeNull();
    expect(goalFor(day)).toBe(
      "1/3 · Hear Frost's speech on the steps of the Global DEX.",
    );
    expect(goalFor({ ...day, drain: 4 })).toContain("draining");
    expect(noteFor(day)).toBe("E: Rally's place");
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
        idCard: true,
        seen: true,
        slip: true,
        sound: { effects: false, music: true, volume: 0.5 },
        wish: 3,
        won: true,
      }),
    ).toEqual({
      beamups: 0,
      best: 12,
      day: 3,
      dream: 0,
      fate: 0,
      hero: 2,
      hover: false,
      idCard: true,
      keycard: false,
      loft: 0,
      loops: 0,
      machine: false,
      owed: false,
      repo: false,
      seen: true,
      slip: true,
      sound: { effects: false, music: true, volume: 0.5 },
      wish: 3,
      won: true,
    });
    expect(
      restore({
        best: -1,
        day: 9,
        hero: 2.5,
        seen: "yes",
        slip: 1,
        sound: 7,
        wish: 5,
        won: "yes",
      }),
    ).toEqual({ ...freshProgress, sound: defaultSound });
  });

  it("keeps the best day, opens the next story day after a night at home, and unlocks Slip in the airdrop", () => {
    const lazy = afterDay(freshProgress, { ...day, cause: "home", made: 300 });
    expect(lazy.progress.day).toBe(1);
    const home = afterDay(freshProgress, {
      ...day,
      cause: "home",
      done: ["riot", "speech", "wallet-found", "wallet-returned"],
      made: 300,
      paper: 4,
    });
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
    // The last day is never slept on to a next one: it ends on SHA Beach.
    expect(
      afterDay({ ...freshProgress, day: 7 }, { ...day, cause: "home", day: 7 })
        .progress.day,
    ).toBe(7);
    expect(
      afterDay({ ...freshProgress, day: 3 }, { ...day, cause: "home" }).progress
        .day,
    ).toBe(3);
    expect(
      afterDay(freshProgress, { ...day, day: 4, storm: 40 }).progress.slip,
    ).toBe(true);
  });
});

describe("the player's hands", () => {
  const hands = () => ({
    answer: vi.fn<(choice: number) => void>(),
    bag: vi.fn<() => void>(),
    gait: vi.fn<(mode: number, held?: boolean) => void>(),
    jump: vi.fn<() => void>(),
    look: vi.fn<() => void>(),
    act: vi.fn<() => void>(),
    lift: vi.fn<(by: number) => void>(),
    shoot: vi.fn<() => void>(),
    power: vi.fn<() => void>(),
    move: vi.fn<(dir: number) => void>(),
    no: vi.fn<() => void>(),
    pause: vi.fn<() => void>(),
    start: vi.fn<() => void>(),
    tapStart: vi.fn<() => void>(),
    turn: vi.fn<(by: number) => void>(),
  });
  const press = (code: string, type = "keydown") =>
    window.dispatchEvent(new KeyboardEvent(type, { code }));

  it("turn two held keys into one of eight headings, and a thumb's slide on the stick into one of sixteen", () => {
    expect([
      headingOf(0, 0),
      headingOf(1, 0),
      headingOf(1, 1),
      headingOf(0, 1),
      headingOf(-1, 0),
      headingOf(0, -1),
      headingOf(1, -1),
    ]).toEqual([-1, 0, 2, 4, 8, 12, 14]);
    expect([
      wayOf(0, 0),
      wayOf(5, 6),
      wayOf(30, 0),
      wayOf(0, 30),
      wayOf(-30, 0),
      wayOf(0, -30),
      wayOf(20, 8),
    ]).toEqual([-1, -1, 0, 4, 8, 12, 1]);
  });

  it("leave the screen to the ring's touch before a day, the stick's half and an act during one, and no and yes while an offer waits", () => {
    expect([
      zoneAt("waiting", { x: 0.1, y: 0.5 }),
      zoneAt("waiting", { x: 0.5, y: 0.5 }),
    ]).toEqual([null, null]);
    expect([
      zoneAt("asked", { x: 0.2, y: 0.5 }),
      zoneAt("asked", { x: 0.8, y: 0.5 }),
    ]).toEqual(["no", "act"]);
    expect([
      zoneAt("playing", { x: 0.4, y: 0.62 }),
      zoneAt("playing", { x: 0.22, y: 0.62 }),
      zoneAt("playing", { x: 0.8, y: 0.5 }),
    ]).toEqual([null, null, "act"]);
    const hand = hands();
    for (const zone of ["act", "no"] as const) enterZone(hand, zone);
    expect(hand.move).not.toHaveBeenCalled();
    expect(hand.turn).not.toHaveBeenCalled();
    expect(
      [hand.tapStart, hand.act, hand.no].map(
        (called) => called.mock.calls.length,
      ),
    ).toEqual([0, 1, 1]);
  });

  it("walk on held keys, act, answer, lift, fire the freeze ray, start and pause, and turn the ring only while waiting", () => {
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
    for (const code of [
      "KeyE",
      "KeyX",
      "KeyR",
      "KeyF",
      "Enter",
      "KeyP",
      "KeyG",
      "KeyQ",
    ])
      press(code);
    press("KeyE", "keyup");
    expect(
      [hand.act, hand.no, hand.start, hand.pause, hand.shoot, hand.power].map(
        (called) => called.mock.calls.length,
      ),
    ).toEqual([1, 1, 1, 1, 1, 1]);
    expect(hand.lift.mock.calls).toEqual([[1], [-1]]);
    // Space jumps, Shift held runs, C crouches, Z crawls, B and I open the backpack, 5 picks a fifth answer.
    for (const code of [
      "Space",
      "ShiftLeft",
      "KeyC",
      "KeyZ",
      "KeyB",
      "KeyI",
      "Digit5",
    ])
      press(code);
    press("ShiftLeft", "keyup");
    expect([hand.jump.mock.calls.length, hand.bag.mock.calls.length]).toEqual([
      1, 2,
    ]);
    expect(hand.gait.mock.calls).toEqual([[1, true], [2], [3], [1, false]]);
    expect(hand.answer).toHaveBeenCalledWith(4);
    stop();
    press("KeyE");
    expect(hand.act).toHaveBeenCalledTimes(1);
  });
});
