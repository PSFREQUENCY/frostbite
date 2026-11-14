import { describe, expect, it } from "vitest";

import {
  percentLabel,
  shareOf,
  unitsLabel,
  waitLabel,
  whenLabel,
} from "../src/domain/format.ts";

describe("how the program's figures are written", () => {
  it("groups the digits of an amount and names the unit, from a number or from digits", () => {
    expect(unitsLabel(1_234_567n)).toBe("1,234,567 sats");
    expect(unitsLabel("0")).toBe("0 sats");
    expect(unitsLabel("10000000")).toBe("10,000,000 sats");
  });

  it("writes a share in percent, to the hundredth only where it has one", () => {
    expect(percentLabel(300)).toBe("3%");
    expect(percentLabel(250)).toBe("2.5%");
    expect(percentLabel(5)).toBe("0.05%");
    expect(percentLabel(9_999)).toBe("99.99%");
    expect(percentLabel(100)).toBe("1%");
  });

  it("writes a wait in the largest whole unit, and keeps seconds that are not a whole minute", () => {
    expect(waitLabel(0)).toBe("no wait");
    expect(waitLabel(60)).toBe("1 minute");
    expect(waitLabel(3_600)).toBe("1 hour");
    expect(waitLabel(7_200)).toBe("2 hours");
    expect(waitLabel(86_400 * 30)).toBe("30 days");
    expect(waitLabel(90)).toBe("90 seconds");
    expect(waitLabel(1)).toBe("1 second");
  });

  it("writes a time the same everywhere, in UTC", () => {
    expect(whenLabel(new Date("2026-11-14T12:34:56.000Z"))).toBe(
      "2026-11-14 12:34 UTC",
    );
  });

  it("works out a share of a fee the way the ledger does, rounding down", () => {
    expect(shareOf(3_000n, 300)).toBe(90n);
    expect(shareOf(1_999n, 300)).toBe(59n);
    expect(shareOf(10n, 1)).toBe(0n);
  });
});
