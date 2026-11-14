import { describe, expect, it } from "vitest";

import { earningStateOf } from "../src/earnings.ts";
import { largestFirst } from "../src/pot.ts";
import { createProgram } from "../src/program.ts";

describe("the program before anyone has set it", () => {
  it("is none, with no history", async () => {
    const program = createProgram({
      programs: {
        allInForce: async () => [],
        history: async () => [],
        inForce: async () => null,
        setProgram: async () => ({ code: "unknown-kind", ok: false }),
      },
    });
    expect(await program.current()).toBeNull();
    expect(await program.history()).toEqual([]);
  });
});

describe("where an earning stands", () => {
  const now = new Date("2026-11-14T12:00:00.000Z");
  const before = new Date("2026-11-14T11:00:00.000Z");
  const after = new Date("2026-11-14T13:00:00.000Z");
  it("is a reversal, maturing, payable, in a payout, or paid", () => {
    expect(
      earningStateOf(
        { kind: "reversal", payableAt: before, payoutId: null },
        undefined,
        now,
      ),
    ).toBe("reversal");
    expect(
      earningStateOf(
        { kind: "accrual", payableAt: after, payoutId: null },
        undefined,
        now,
      ),
    ).toBe("maturing");
    expect(
      earningStateOf(
        { kind: "accrual", payableAt: before, payoutId: null },
        undefined,
        now,
      ),
    ).toBe("payable");
    expect(
      earningStateOf(
        { kind: "accrual", payableAt: before, payoutId: "p" },
        "requested",
        now,
      ),
    ).toBe("in-payout");
    expect(
      earningStateOf(
        { kind: "accrual", payableAt: before, payoutId: "p" },
        "complete",
        now,
      ),
    ).toBe("paid");
  });
});

describe("sorting amounts, the largest first", () => {
  it("puts the larger before the smaller, and leaves equals as they are", () => {
    expect(largestFirst(5n, 3n)).toBe(-1);
    expect(largestFirst(3n, 5n)).toBe(1);
    expect(largestFirst(4n, 4n)).toBe(0);
  });
});
