import { describe, expect, it } from "vitest";

import {
  reversalEffectOf,
  reversalEffects,
  takeBackInputSchema,
  takeBackResponseSchema,
} from "../src/referrals/reversals.ts";

describe("what taking an earning back does to the money", () => {
  it("leaves the pot for an earning in no payout, however far it has matured", () => {
    expect(reversalEffectOf("maturing")).toBe("pot");
    expect(reversalEffectOf("payable")).toBe("pot");
  });

  it("lets a payout that has not finished go out, and holds the amount back afterwards", () => {
    expect(reversalEffectOf("in-payout")).toBe("pending-payout");
  });

  it("holds an amount already paid back from what is earned next", () => {
    expect(reversalEffectOf("paid")).toBe("paid");
  });

  it("is one of three, and every one can be answered", () => {
    expect([...reversalEffects].sort()).toEqual([
      "paid",
      "pending-payout",
      "pot",
    ]);
    for (const effect of reversalEffects)
      expect(
        takeBackResponseSchema.safeParse({ effect, status: "saved" }).success,
      ).toBe(true);
  });
});

describe("the request to take an earning back", () => {
  const earningId = "0198a5c4-7b3e-7c1a-8f2d-4e5b6a7c8d9e";
  it("needs the earning and a reason, trimmed, of at most 500 characters, and nothing else", () => {
    expect(
      takeBackInputSchema.parse({ earningId, reason: "  Why  " }).reason,
    ).toBe("Why");
    for (const bad of [
      { earningId, reason: "   " },
      { earningId, reason: "x".repeat(501) },
      { earningId: "nope", reason: "Why" },
      { earningId, reason: "Why", actor: "someone" },
    ])
      expect(takeBackInputSchema.safeParse(bad).success).toBe(false);
  });
});
