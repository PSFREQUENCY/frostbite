import { describe, expect, it } from "vitest";

import { faucetDun } from "../src/rules/constants.ts";
import { createBot } from "./support/bot.ts";
import { refusal } from "./support/replay.ts";

const now = (bot: ReturnType<typeof createBot>) => ({ tick: bot.here().tick });

describe("spots", () => {
  it("give first DUN once, carry one parcel at a time and pay on delivery, more to a charmer", () => {
    const bot = createBot(1, 7, 1);
    bot.go(18_000, 18_000);
    expect(refusal(bot.here(), "act", now(bot))).toBe("nothing to do here");
    bot.use("faucet");
    expect(bot.state().pocket).toBe(faucetDun);
    expect(refusal(bot.state(), "act", now(bot))).toBe(
      "that is used up for today",
    );
    bot.go(15_000, 18_000);
    expect(refusal(bot.here(), "act", now(bot))).toBe(
      "nothing to deliver here",
    );
  });

  it("refuse a second parcel, a delivery to the wrong door, and a home that is not yours", () => {
    const bot = createBot(1, 0, 1);
    bot.use("gig-neon");
    expect(bot.state().parcel).toBe("drop-exchange");
    bot.go(19_500, 18_000);
    expect(refusal(bot.here(), "act", now(bot))).toBe(
      "deliver the parcel you carry first",
    );
    bot.go(20_500, 30_000);
    expect(refusal(bot.here(), "act", now(bot))).toBe(
      "nothing to deliver here",
    );
    bot.use("drop-exchange");
    expect([
      bot.state().gigs,
      bot.state().pocket,
      bot.state().made,
      bot.state().rep,
    ]).toEqual([1, 198, 198, 10]);
    bot.go(18_000, 15_500);
    expect(refusal(bot.here(), "act", now(bot))).toBe("this is not your place");
  });

  it("sell loot for half, stash the pocket in the freezer, and refuse when there is nothing to sell or stash", () => {
    const bot = createBot(1, 4, 1);
    bot.go(6_000, 25_500);
    expect(refusal(bot.here(), "act", now(bot))).toBe("nothing to sell");
    bot.go(13_500, 30_000);
    expect(refusal(bot.here(), "act", now(bot))).toBe("nothing to stash");
    bot.use("loot-vault");
    expect([bot.state().hot, bot.state().heat, bot.state().rep]).toEqual([
      600,
      160 - 36,
      0,
    ]);
    bot.use("fence");
    expect([bot.state().hot, bot.state().pocket, bot.state().fenced]).toEqual([
      0, 300, 300,
    ]);
    bot.use("freezer");
    expect([bot.state().pocket, bot.state().freezer]).toEqual([0, 300]);
  });

  it("hold a tool, a word, and a booth that sells a new look to those with heat and DUN", () => {
    const bot = createBot(1, 7, 3);
    bot.go(22_500, 18_000);
    expect(refusal(bot.here(), "act", now(bot))).toBe("no heat to lose");
    bot.use("word-b");
    bot.use("loot-vault");
    bot.use("rebrand");
    expect([bot.state().words, bot.state().heat, bot.state().pocket]).toEqual([
      1,
      0,
      3_000 - 150,
    ]);
    const broke = createBot(1, 7, 1);
    broke.use("loot-vault");
    broke.go(22_500, 18_000);
    expect(refusal(broke.here(), "act", now(broke))).toBe("not enough DUN");
    const tooled = createBot(1, 8, 1);
    tooled.use("tool-magnet");
    expect(tooled.state().tools).toBe(1);
  });
});

describe("offers", () => {
  it("wait for an answer; a scam taken costs the pocket, and walked away from it is a scam spotted", () => {
    const bot = createBot(1, 1, 3);
    bot.use("offer-kiki");
    expect(bot.state().talk).toBe("offer-kiki");
    expect(refusal(bot.state(), "act", now(bot))).toBe(
      "answer the offer first",
    );
    bot.pick(true);
    expect([bot.state().pocket, bot.state().rugged, bot.state().talk]).toEqual([
      3_000 - 400,
      1,
      null,
    ]);
    expect(refusal(bot.state(), "act", now(bot))).toBe(
      "that is used up for today",
    );
    const wary = createBot(1, 1, 1);
    wary.use("offer-kiki");
    wary.pick(false);
    expect([wary.state().spotted, wary.state().pocket]).toEqual([1, 0]);
    const poor = createBot(1, 1, 1);
    poor.use("offer-kiki");
    poor.pick(true);
    expect([poor.state().pocket, poor.state().rugged]).toEqual([0, 1]);
  });

  it("pay when they are honest, and the seed decides the one that could be either", () => {
    const bot = createBot(1, 4, 1);
    bot.use("offer-scruff");
    bot.pick(true);
    expect([bot.state().pocket, bot.state().made]).toEqual([400, 400]);
    const honest = createBot(1, 7, 3);
    honest.use("offer-yield");
    honest.pick(true);
    expect(honest.state().pocket).toBe(3_300);
    const scam = createBot(3, 7, 3);
    scam.use("offer-yield");
    scam.pick(true);
    expect(scam.state().pocket).toBe(2_700);
    const passed = createBot(1, 7, 3);
    passed.use("offer-yield");
    passed.pick(false);
    expect([passed.state().spotted, passed.state().pocket]).toEqual([0, 3_000]);
  });

  it("recruit a crew of three at most, never the lead, and not the one who said no again today", () => {
    const bot = createBot(1, 0, 1);
    bot.go(3_500, 18_000);
    expect(refusal(bot.here(), "act", now(bot))).toBe("that is you");
    bot.use("recruit-7");
    bot.pick(false);
    expect(bot.state().crew).toEqual([]);
    expect(refusal(bot.state(), "act", now(bot))).toBe(
      "that is used up for today",
    );
    bot.use("recruit-2");
    bot.pick(true);
    bot.use("recruit-4");
    bot.pick(true);
    expect(bot.state().crew).toEqual([2, 4]);
    bot.go(3_500, 6_000);
    expect(refusal(bot.here(), "act", now(bot))).toBe("the crew is full");
  });
});
