import type { ReferralProgram } from "@frostbite/referrals";
import { describe, expect, it } from "vitest";

import {
  freezeRefusalCopy,
  programRefusalCopy,
  programSavedCopy,
} from "../src/domain/admin-copy.ts";
import { historyWords, mineWords, termsOf } from "../src/domain/copy.ts";

const program = (change: Partial<ReferralProgram> = {}): ReferralProgram => ({
  changedAt: new Date("2026-11-14T12:00:00.000Z"),
  changedBy: null,
  enabled: true,
  id: "p",
  maturitySeconds: 3_600,
  minimumPayout: 10_000n,
  rateBasisPoints: 300,
  ...change,
});

describe("the terms a visitor is told", () => {
  it("say nothing for a program nobody has set up", () => {
    expect(termsOf(null, 3_000n)).toEqual([]);
  });

  it("state the share, a worked example, the wait, the minimum, and that payouts are in batches, all from the record", () => {
    const terms = termsOf(program(), 3_000n);
    expect(terms[0]).toBe(
      "You earn 3% of the platform fee on every milestone a person you brought mints. On a 3,000 sats fee that is 90 sats each time.",
    );
    expect(terms.join(" ")).toContain("waits 1 hour");
    expect(terms.join(" ")).toContain("10,000 sats");
    expect(terms.join(" ")).toContain("signed in batches");
  });

  it("change with the record: another share, no wait, no minimum", () => {
    const terms = termsOf(
      program({ maturitySeconds: 0, minimumPayout: 0n, rateBasisPoints: 250 }),
      3_000n,
    );
    expect(terms[0]).toContain("2.5%");
    expect(terms[0]).toContain("75 sats");
    expect(terms.join(" ")).toContain("as soon as the mint is confirmed");
    expect(terms.join(" ")).toContain("once you have 0 sats");
  });
});

describe("the words about a person's own numbers", () => {
  it("say one person and many in the right form", () => {
    expect(mineWords.brought(1)).toBe("1 person signed up");
    expect(mineWords.brought(3)).toBe("3 people signed up");
    expect(mineWords.minted(1)).toBe("1 has minted");
    expect(mineWords.minted(2)).toBe("2 have minted");
    expect(mineWords.progress(500n, 10_000n)).toBe(
      "500 sats of 10,000 sats needed to ask for a payout",
    );
  });

  it("have a word for every state of an earning and of a payout", () => {
    expect(Object.keys(historyWords.states).sort()).toEqual([
      "in-payout",
      "maturing",
      "paid",
      "payable",
      "reversal",
    ]);
    expect(Object.keys(historyWords.payoutStates).sort()).toEqual([
      "cancelled",
      "complete",
      "failed",
      "in_progress",
      "requested",
    ]);
  });
});

describe("what an administrator is told after a change", () => {
  it("says what the saved program does, on or off", () => {
    expect(
      programSavedCopy({
        enabled: true,
        maturitySeconds: 0,
        minimumPayoutUnits: "5000",
      }),
    ).toBe(
      "Saved. Earning is on, with a minimum payout of 5,000 sats and no wait before an earning can be paid.",
    );
    expect(
      programSavedCopy({
        enabled: false,
        maturitySeconds: 0,
        minimumPayoutUnits: "0",
      }),
    ).toContain("Earning is off");
  });

  it("says what each refusal means and that nothing changed", () => {
    for (const reason of ["above-maximum", "invalid-rate"] as const)
      expect(programRefusalCopy({ reason, status: "refused" })).toContain(
        "Nothing was changed.",
      );
    for (const reason of ["invalid-reason", "not-found"] as const)
      expect(freezeRefusalCopy({ reason, status: "refused" })).not.toBe("");
  });
});
