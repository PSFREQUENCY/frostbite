// @vitest-environment jsdom
import { beforeAll, describe, expect, it, vi } from "vitest";

import { buildDexFloor } from "../src/view/dex-floor.ts";
import { buildLofts } from "../src/view/lofts.ts";
import { started } from "./support/replay.ts";

// A 2D context that takes every drawing call and keeps the words written.
const written: string[] = [];
beforeAll(() => {
  const context = new Proxy(
    {},
    {
      get: (_, key) =>
        key === "fillText"
          ? (text: string) => void written.push(text)
          : key === "measureText"
            ? (text: string) => ({ width: text.length * 20 })
            : () => undefined,
      set: () => true,
    },
  );
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
    () => context as unknown as CanvasRenderingContext2D,
  );
});

describe("the shop's laptop", () => {
  it("shows what is in the till, and draws again only when it changes", () => {
    const lofts = buildLofts();
    const day = { ...started(1, 7, 2), tick: 900 };
    lofts.show(day);
    expect(written).toEqual(["MY SHOP · SALES", "60 DUN"]);
    lofts.show({ ...day, tick: 910 });
    expect(written).toHaveLength(2);
    lofts.show({ ...day, tick: 30_000 });
    expect(written.at(-1)).toBe("2,000 DUN");
  });
});

describe("the DEX's screens", () => {
  it("paint the island's coins on the tickers and the big board, and scroll the tickers", () => {
    written.length = 0;
    const floor = buildDexFloor();
    expect(written).toEqual(
      expect.arrayContaining(["DUN", "▲+2.4%", "MAXX", "▼-1.2%", "-1.2%"]),
    );
    floor.show(4);
    // Joined by material: a few dozen draws for the whole floor.
    expect(floor.root.children.length).toBeLessThan(40);
  });
});
