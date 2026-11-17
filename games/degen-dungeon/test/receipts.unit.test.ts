// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

import { createReceipts } from "../src/page/receipts.ts";
import { weatherNames } from "../src/page/words.ts";
import type { DayState } from "../src/rules/types.ts";
import { started } from "./support/replay.ts";

afterEach(() => vi.useRealTimers());

describe("money on the move", () => {
  it("floats green coming in and red going out, prints a receipt, chimes, and adds up changes close together", () => {
    vi.useFakeTimers();
    const bar = document.createElement("p");
    const card = document.createElement("aside");
    const chime = vi.fn<(gain: boolean) => void>();
    const receipts = createReceipts(bar, card, chime);
    const day: DayState = { ...started(1, 7, 1), pocket: 100, tick: 10 };
    receipts.show(null, 0);
    receipts.show(day, 0);
    expect(bar.children).toHaveLength(0);
    receipts.show({ ...day, pocket: 125, tick: 20 }, 100);
    const pop = bar.querySelector(".coin-pop");
    expect([pop?.textContent, pop?.className]).toEqual([
      "+25 DUN",
      "coin-pop gain",
    ]);
    expect(card.hidden).toBe(false);
    expect(card.textContent).toContain("RECEIVED +25 DUN");
    expect(card.textContent).toContain("BALANCE 125 DUN");
    expect(card.textContent).toMatch(/BLOCK 20 · TX 0x[0-9a-f]{8}/u);
    receipts.show({ ...day, pocket: 150, tick: 25 }, 300);
    expect(bar.children).toHaveLength(1);
    expect(bar.querySelector(".coin-pop")?.textContent).toBe("+50 DUN");
    receipts.show({ ...day, pocket: 140, tick: 30 }, 400);
    expect(bar.children).toHaveLength(2);
    expect(bar.lastElementChild?.textContent).toBe("−10 DUN");
    expect(bar.lastElementChild?.className).toBe("coin-pop loss");
    expect(card.textContent).toContain("PAID −10 DUN");
    expect(chime.mock.calls).toEqual([[true], [false]]);
    receipts.show({ ...day, pocket: 140, tick: 40 }, 5_000);
    expect(card.hidden).toBe(true);
    vi.advanceTimersByTime(2_000);
    expect(bar.children).toHaveLength(0);
    receipts.show({ ...day, pocket: 9, tick: 0 }, 6_000);
    expect(bar.children).toHaveLength(0);
  });

  it("names every weather for the readout", () => {
    expect(Object.values(weatherNames)).toHaveLength(7);
    expect(weatherNames.storm).toBe("Thunderstorm");
  });
});
