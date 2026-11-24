import { describe, expect, it } from "vitest";

import { drainPace, nightTick } from "../src/rules/constants.ts";
import { advance } from "../src/rules/day.ts";
import { degenRules } from "../src/rules/index.ts";
import {
  kerbOf,
  lateFee,
  rentOf,
  rents,
  upgrades,
} from "../src/rules/lofts.ts";
import { spotNamed } from "../src/rules/places.ts";
import { lofts, roomAt } from "../src/rules/rooms.ts";
import type { DayState } from "../src/rules/types.ts";
import { goalFor, talkOf } from "../src/page/words.ts";
import { afterDay, freshProgress, nextRun, restore } from "../src/progress.ts";
import { lockedOutLine, rentLine, tillLine } from "../src/script/lofts.ts";
import { createBot } from "./support/bot.ts";
import { refusal, started } from "./support/replay.ts";

const pick = (day: DayState, talk: string, choice: number): DayState => {
  const stepped = degenRules.step(
    { ...day, talk },
    { data: { choice, tick: day.tick }, type: "pick" },
  );
  if (!stepped.ok) throw new Error(stepped.reason);
  return stepped.state;
};
const why = (day: DayState, talk: string, choice: number): string | null =>
  refusal({ ...day, talk }, "pick", { choice, tick: day.tick });

describe("the lofts", () => {
  it("wake every hero in bed in their own loft, with the landlord out on the street by the door", () => {
    lofts.forEach((loft, hero) => {
      const day = started(1, hero, 2);
      expect(roomAt(day.x, day.z), loft.id).toBe(loft);
      const landlord = spotNamed(`landlord-${String(hero)}`);
      expect(landlord?.only).toBe(hero);
      expect(roomAt(landlord?.x ?? 0, landlord?.z ?? 0)).toBeNull();
    });
    expect([rentOf(started(1, 7, 1)), rentOf(started(1, 7, 7))]).toEqual([
      rents[0],
      0,
    ]);
    expect(rentOf({ ...started(1, 7, 1), loop: 1 })).toBe(0);
  });

  it("take the rent at the landlord's, then sell the patio, the balcony and the view, one at a time and in order", () => {
    const bot = createBot(1, 7, 2);
    bot.use("landlord-7");
    expect(bot.state().talk).toBe("landlord");
    expect(talkOf(bot.state())?.answers[0]).toBe(
      `Pay the rent: ${String(rents[1])} DUN`,
    );
    const pocket = bot.state().pocket;
    bot.pick(0);
    expect([bot.state().pocket, bot.state().done]).toEqual([
      pocket - rents[1],
      ["rent-paid"],
    ]);
    const paid = { ...bot.state(), pocket: 10_000 };
    expect(why(paid, "landlord-up", 1)).toBe("one upgrade at a time, in order");
    const patio = pick(paid, "landlord-up", 0);
    expect([patio.loft, patio.pocket, patio.talk]).toEqual([
      1,
      10_000 - upgrades[0][1],
      "landlord-up",
    ]);
    expect(why(patio, "landlord-up", 0)).toBe("your loft has that already");
    const balcony = pick(patio, "landlord-up", 1);
    expect(why({ ...balcony, pocket: 0 }, "landlord-up", 2)).toBe(
      "not enough DUN",
    );
    expect(pick(balcony, "landlord-up", 2).loft).toBe(upgrades.length);
    const broke = { ...started(1, 7, 2), pocket: 0 };
    expect(why(broke, "landlord", 0)).toBe("not enough DUN");
  });

  it("put the hero's things on the kerb at nightfall if the rent is unpaid, with any seed paper in the bed or the freezer", () => {
    const evening = { ...started(1, 7, 1), paper: 4, tick: nightTick - 1 };
    const out = advance(evening, nightTick);
    expect([out.done, out.drain]).toEqual([["evicted"], drainPace]);
    expect(advance({ ...evening, paper: 1 }, nightTick).drain).toBe(0);
    const paid = { ...evening, done: ["rent-paid"] };
    expect(advance(paid, nightTick).done).toEqual(["rent-paid"]);
    // Locked out: the bed is refused and the landlord asks the rent and the late fee.
    const home = spotNamed("home-7");
    const kerb = { ...out, pocket: 1_000, x: home?.x ?? 0, z: home?.z ?? 0 };
    expect(refusal(kerb, "act", { tick: kerb.tick })).toBe(
      "your things are out on the kerb: pay the landlord to get back in",
    );
    expect(goalFor(kerb)).toBe(lockedOutLine);
    const back = pick(kerb, "landlord-out", 0);
    expect([back.pocket, refusal(back, "act", { tick: back.tick })]).toEqual([
      1_000 - rents[0] - lateFee,
      null,
    ]);
    expect(talkOf({ ...kerb, talk: "landlord-out" })?.say).toContain(
      String(rents[0] + lateFee),
    );
    // Short of the rent with the shop's till full enough, Pip sends the hero to the laptop; and a minute before nightfall, to the rent.
    const due = { ...evening, done: ["riot", "speech"] };
    expect([due.pocket < rents[0], goalFor(due)]).toEqual([true, tillLine]);
    expect(goalFor({ ...due, pocket: 1_000 })).toBe(rentLine);
  });

  it("carry the upgrades from day to day, and wake a hero who left the rent unpaid on the kerb the next morning", () => {
    const day = { ...started(1, 7, 2), cause: "home" as const, loft: 2 };
    const kept = afterDay({ ...freshProgress, day: 2 }, day).progress;
    expect([kept.loft, kept.owed]).toEqual([2, true]);
    expect(nextRun(kept)).toMatchObject({ day: 2, loft: 2, owed: true });
    const paid = afterDay(freshProgress, {
      ...day,
      day: 1,
      done: ["rent-paid"],
    }).progress;
    expect(paid.owed).toBe(false);
    expect(restore({ loft: 9, owed: "yes" })).toMatchObject({
      loft: 0,
      owed: false,
    });
    const owed = degenRules.init(1, { day: 2, hero: 7, loft: 3, owed: 1 });
    if (!owed.ok) throw new Error(owed.reason);
    expect(owed.state).toMatchObject({ ...kerbOf(7), loft: 3 });
    expect(degenRules.init(1, { day: 1, hero: 7, owed: 1 })).toEqual({
      ok: false,
      reason: "owed is 1, from the second day on",
    });
    expect(degenRules.init(1, { day: 2, hero: 7, loft: 4 })).toEqual({
      ok: false,
      reason: "loft is 1 to 3, the upgrades bought",
    });
    expect(degenRules.init(1, { day: 1, hero: 7, loft: 1, loop: 1 })).toEqual({
      ok: false,
      reason:
        "a trip back starts fresh, with no fate, boon, ID, loft or rent owed",
    });
  });
});
