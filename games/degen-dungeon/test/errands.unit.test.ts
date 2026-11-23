import { describe, expect, it } from "vitest";

import { catchRadius } from "../src/rules/constants.ts";
import {
  errandDeed,
  errandOpen,
  errandTick,
  purseReward,
  thiefPace,
  thiefRoute,
  thiefStart,
  walletReward,
} from "../src/rules/errands.ts";
import { openTo, spotNamed } from "../src/rules/places.ts";
import { sidesOf } from "../src/sides.ts";
import { createBot } from "./support/bot.ts";
import { refusal, started } from "./support/replay.ts";
import { adorDoor, returnWallet } from "./support/story.ts";

type Bot = ReturnType<typeof createBot>;

// The first morning up to the wallet given back, with the speech heard on the DEX steps.
function morning(): Bot {
  const bot = createBot(1, 7, 1);
  bot.use("frost");
  for (let line = 0; line < 3; line += 1) bot.pick(0);
  returnWallet(bot);
  return bot;
}

// After the thief at a run: onto his street, east to the avenue, and south after him.
function chase(bot: Bot): void {
  bot.gait(1);
  bot.leg("z", thiefRoute[0]?.z ?? 0);
  bot.leg("x", thiefRoute[0]?.x ?? 0);
  if (bot.state().thief !== null) bot.leg("z", thiefRoute[1]?.z ?? 0);
}

describe("the first morning's errands", () => {
  it("lay the wallet on the street once the speech is heard, and keep Pearl in ADOR until it is back", () => {
    const day = started(1, 7, 1);
    const has = (...done: string[]) => ({ ...day, done });
    expect(errandOpen("wallet", day)).toBe(false);
    expect(errandOpen("wallet", has("speech"))).toBe(true);
    expect(errandOpen("wallet", has("speech", "wallet-found"))).toBe(false);
    expect(errandOpen("pearl", has("wallet-found"))).toBe(true);
    expect(errandOpen("pearl", has("wallet-returned"))).toBe(false);
    expect(errandOpen("rosa", day)).toBe(false);
    expect(errandOpen("rosa", has("snatch"))).toBe(true);
    expect(errandOpen("rosa", has("snatch", "purse-returned"))).toBe(false);
    const wallet = spotNamed("wallet");
    if (wallet === undefined) throw new Error("no wallet");
    // Only on the first morning, and not on a trip back.
    expect(openTo(wallet, has("speech"))).toBe(true);
    expect(openTo(wallet, { ...started(1, 7, 2), done: ["speech"] })).toBe(
      false,
    );
  });

  it("pay for the wallet given back only once it is found, and for the purse only once the thief is caught", () => {
    const day = { ...started(1, 7, 1), pocket: 0, rep: 0 };
    expect(errandDeed({ ...day }, "errand-give")).toBe("find her wallet first");
    const found = { ...day, done: ["wallet-found"] };
    expect(errandDeed(found, "errand-give")).toBeNull();
    expect([found.pocket, found.rep, found.done]).toEqual([
      walletReward,
      10,
      ["wallet-found", "wallet-returned"],
    ]);
    const robbed = { ...day, done: ["snatch"] };
    expect(errandDeed(robbed, "errand-purse")).toBe(
      "catch him first: he ran east",
    );
    const caught = { ...day, done: ["snatch", "purse-caught"] };
    expect(errandDeed(caught, "errand-purse")).toBeNull();
    expect([caught.pocket, caught.rep]).toEqual([purseReward, 15]);
    expect(errandDeed({ ...day }, "errand-dance")).toBe("nothing to do");
  });

  it("walk the wallet into ADOR to Pearl, then show the snatch at the door as the hero steps back onto the street", () => {
    const bot = createBot(1, 7, 1);
    bot.use("frost");
    for (let line = 0; line < 3; line += 1) bot.pick(0);
    expect(bot.state().done).not.toContain("wallet-found");
    bot.use("wallet");
    bot.pick(0);
    const pocket = bot.state().pocket;
    const pearl = spotNamed("pearl");
    if (pearl === undefined) throw new Error("no Pearl");
    bot.go(adorDoor.x, adorDoor.z);
    bot.leg("z", pearl.z);
    bot.leg("x", pearl.x);
    bot.act();
    bot.pick(0);
    expect([bot.state().pocket - pocket, bot.state().thief]).toEqual([
      walletReward,
      null,
    ]);
    bot.leg("x", adorDoor.x);
    bot.leg("z", adorDoor.z);
    expect(bot.state().done).toContain("snatch");
    expect(bot.state().thief).not.toBeNull();
    // Rosa cannot be paid back yet: the purse is still with the thief.
    bot.use("rosa");
    expect(
      refusal(bot.state(), "pick", { choice: 0, tick: bot.state().tick }),
    ).toBe("catch him first: he ran east");
  });

  it("send the thief east and then south at his own pace, where he stops for breath; a walk never closes on him", () => {
    const bot = morning();
    const start = bot.here().thief;
    expect((start?.x ?? 0) > thiefStart.x).toBe(true);
    bot.wait(1);
    const next = bot.here().thief;
    expect([(next?.x ?? 0) - (start?.x ?? 0)]).toEqual([thiefPace]);
    bot.wait(2_000);
    bot.head(8);
    bot.head(-1);
    expect(bot.here().thief).toEqual(thiefRoute.at(-1));
    expect(bot.here().done).not.toContain("purse-caught");
    // Walking after him from the start, the hero never comes within reach.
    const walker = morning();
    walker.leg("z", thiefRoute[0]?.z ?? 0);
    walker.leg("x", thiefRoute[0]?.x ?? 0);
    const after = walker.state().thief;
    expect(after).not.toBeNull();
    expect(
      Math.abs((after?.x ?? 0) - walker.state().x) > catchRadius ||
        Math.abs((after?.z ?? 0) - walker.state().z) > catchRadius,
    ).toBe(true);
  });

  it("let a running hero catch the thief and give Rosa her purse back, a side quest done", () => {
    const bot = morning();
    chase(bot);
    expect([bot.state().thief, bot.state().done]).toEqual([
      null,
      expect.arrayContaining(["purse-caught"]),
    ]);
    const pocket = bot.state().pocket;
    bot.gait(0);
    bot.use("rosa");
    bot.pick(0);
    expect(bot.state().pocket - pocket).toBe(purseReward);
    expect(sidesOf(bot.state())[1]?.done).toBe(true);
  });

  it("let only a hero on foot and on the ground catch him, and only on the first morning", () => {
    const close = {
      ...started(1, 7, 1),
      done: ["wallet-returned", "snatch"],
      thief: { x: 22_000, z: 17_600 },
      x: 22_000,
      z: 17_700,
    };
    const scooter = { ...close, ride: "scooter" as const };
    errandTick(scooter);
    expect(scooter.thief).not.toBeNull();
    const flying = { ...close, level: 1 };
    errandTick(flying);
    expect(flying.thief).not.toBeNull();
    const foot = { ...close };
    errandTick(foot);
    expect([foot.thief, foot.done.at(-1)]).toEqual([null, "purse-caught"]);
    const later = { ...close, day: 2 };
    errandTick(later);
    expect(later.thief).toEqual(close.thief);
    const trip = { ...close, loop: 1 };
    errandTick(trip);
    expect(trip.thief).toEqual(close.thief);
  });
});
