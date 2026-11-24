// @vitest-environment jsdom
import { beforeAll, describe, expect, it, vi } from "vitest";

import { haus, penthouseFloor } from "../src/rules/haus.ts";
import { lofts } from "../src/rules/rooms.ts";
import { loop } from "../src/rules/world.ts";
import { linesOf, moonSlogan, shuttlePrint } from "../src/script/ads.ts";
import { paintAd } from "../src/view/tv-ad.ts";
import { buildTvs, paintings } from "../src/view/tvs.ts";
import { started } from "./support/replay.ts";

// A 2D context that takes every drawing call and keeps the words written.
const written: string[] = [];
const context = new Proxy(
  {},
  {
    get: (_, key) =>
      key === "fillText"
        ? (text: string) => void written.push(text)
        : key === "measureText"
          ? (text: string) => ({ width: text.length * 10 })
          : key === "createLinearGradient"
            ? () => ({ addColorStop: () => undefined })
            : () => undefined,
    set: () => true,
  },
);
const pen = context as unknown as CanvasRenderingContext2D;
beforeAll(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
    () => pen,
  );
});

describe("the moon commercial", () => {
  it("breaks the slogan into three lines for a screen", () => {
    expect(linesOf(moonSlogan.toUpperCase(), 12)).toEqual([
      "ONLY MASTERS",
      "CAN MAKE IT",
      "TO THE MOON",
    ]);
  });

  it("shows the rocket first, then the slogan line by line and the small print", () => {
    written.length = 0;
    paintAd(pen, 192, 108, 3);
    expect(written).toEqual([]);
    paintAd(pen, 192, 108, 8);
    expect(written).toEqual([
      "ONLY MASTERS",
      "CAN MAKE IT",
      "TO THE MOON",
      shuttlePrint.toUpperCase(),
    ]);
    // It loops: a moment one loop later paints the same words.
    written.length = 0;
    paintAd(pen, 192, 108, 8 + 9);
    expect(written).toHaveLength(4);
    written.length = 0;
    paintAd(pen, 192, 108, 5.2);
    expect(written).toHaveLength(4);
  });

  it("plays on the TVs eight times a second, scrolling the slogan on ADOR's band", () => {
    const tvs = buildTvs();
    const day = started(1, 7, 3);
    written.length = 0;
    tvs.show(day, 8);
    expect(
      written.filter((text) =>
        text.includes("ONLY MASTERS CAN MAKE IT TO THE MOON"),
      ).length,
    ).toBeGreaterThan(0);
    const after = written.length;
    tvs.show(day, 8 + 0.5 / paintings);
    expect(written).toHaveLength(after);
    tvs.show(day, 8 + 1.5 / paintings);
    expect(written.length).toBeGreaterThan(after);
    tvs.show(null, 9);
    expect(tvs.root.visible).toBe(false);
  });

  it("hangs a TV in the hero's loft, in the penthouse and at every station", () => {
    const tvs = buildTvs();
    const loft = lofts[4];
    tvs.show(started(1, 4, 3), 1);
    const set = tvs.root.getObjectByName("tv-loft");
    expect(set?.position.x).toBeCloseTo((loft?.room.x0 ?? 0) / 100 + 0.12);
    for (const borough of loop)
      expect(
        tvs.root.getObjectByName(`tv-station-${String(borough)}`),
      ).toBeDefined();
    const penthouse = tvs.root.getObjectByName("tv-penthouse");
    tvs.show({ ...started(1, 7, 3), floor: 6, x: haus.x, z: haus.z }, 2);
    expect(penthouse?.visible).toBe(false);
    tvs.show(
      {
        ...started(1, 7, 3),
        floor: penthouseFloor,
        keycard: true,
        x: haus.x,
        z: haus.z,
      },
      3,
    );
    expect(penthouse?.visible).toBe(true);
    tvs.show(started(1, 7, 3), 4);
    expect(penthouse?.visible).toBe(true);
  });
});
