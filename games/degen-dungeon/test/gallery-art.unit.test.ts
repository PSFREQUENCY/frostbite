import { InstancedMesh, Mesh } from "three";
import { describe, expect, it } from "vitest";

import type { DayState } from "../src/rules/types.ts";
import {
  atlas,
  buildGalleryArt,
  pieceCount,
  soldId,
} from "../src/view/gallery-art.ts";
import { paint, styleOf, type Rgb } from "../src/view/pixel-art.ts";
import { started } from "./support/replay.ts";

// Piece `index` painted onto a 16-square grid of colours.
const painted = (index: number): string[][] => {
  const grid = Array.from({ length: 16 }, () =>
    Array.from({ length: 16 }, () => ""),
  );
  paint((x, y, colour: Rgb) => {
    const row = grid[y];
    if (row !== undefined) row[x] = colour.join(",");
  }, index);
  return grid;
};

describe("the Pixel Vault Gallery's art", () => {
  it("paints each piece the same way every time, in four styles, the critters the same on both sides", () => {
    expect(painted(4)).toEqual(painted(4));
    expect(painted(4)).not.toEqual(painted(8));
    expect([0, 1, 2, 3, 4].map(styleOf)).toEqual([
      "critter",
      "sunset",
      "coin",
      "glitch",
      "critter",
    ]);
    const critter = painted(0);
    for (const row of critter) expect(row).toEqual([...row].reverse());
    // The coin's middle is gold; the sunset's sun sits on its sea.
    expect(painted(2)[3]?.[8]).toBe("255,214,102");
    expect(painted(1)[9]?.[0]).not.toBe(painted(1)[10]?.[1]);
  });

  it("puts every piece in one picture, each square filled", () => {
    const map = atlas();
    const data = map.image.data;
    if (!(data instanceof Uint8Array)) throw new Error("no pixels");
    for (let index = 0; index <= pieceCount; index += 1) {
      const [col, row] = [index % 4, Math.floor(index / 4)];
      let blank = 0;
      for (let y = 0; y < 16; y += 1)
        for (let x = 0; x < 16; x += 1) {
          const at = ((63 - (row * 16 + y)) * 64 + col * 16 + x) * 4;
          if (data[at] === 255 && data[at + 1] === 255 && data[at + 2] === 255)
            blank += 1;
        }
      // Little is left the white the picture starts as (a glitch has white stripes of its own).
      expect(blank).toBeLessThan(96);
    }
  });

  it("pulses each frame its own way, and marks the easel's piece sold once a print is bought", () => {
    const art = buildGalleryArt();
    const tubes = art.root.getObjectByName("gallery-frames");
    if (!(tubes instanceof Mesh)) throw new Error("no frames");
    const colour = tubes.geometry.getAttribute("color");
    const day: DayState = started(1, 4, 2);
    art.show(day, 0);
    const bars = colour.count / pieceCount;
    const [a, b] = [colour.getX(0), colour.getX(bars)];
    art.show(day, 0.7);
    expect([colour.getX(0), colour.getX(bars)]).not.toEqual([a, b]);
    const sold = art.root.getObjectByName("gallery-sold");
    const sparkles = art.root.getObjectByName("neon-sparkles");
    expect([
      sold?.visible,
      sparkles instanceof InstancedMesh && sparkles.visible,
    ]).toEqual([false, true]);
    art.show({ ...day, done: [soldId] }, 1);
    expect([sold?.visible, sparkles?.visible]).toEqual([true, false]);
    art.show(null, 2);
    expect(sold?.visible).toBe(false);
  });
});
