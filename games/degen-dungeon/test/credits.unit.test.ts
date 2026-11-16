// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

import { lean, steer, zoneAt } from "../src/page/controls.ts";
import { createCredits, shotAt, titleHold } from "../src/page/credits.ts";
import { creditTitles } from "../src/script/credits.ts";
import { opening } from "../src/view/cine.ts";

beforeAll(() => {
  const body =
    /<body>([\s\S]*)<\/body>/u.exec(
      readFileSync(join(import.meta.dirname, "../index.html"), "utf8"),
    )?.[1] ?? "";
  document.body.innerHTML = body;
});

describe("the opening credits", () => {
  it("hold the title on the card, then roll the credits over the city, and stop for the ring or a day", () => {
    const credits = createCredits(true);
    const box = document.getElementById("clip");
    const title = document.getElementById("clip-title");
    const skip = document.getElementById("clip-skip");
    const usual = skip?.textContent;
    const drawn: number[] = [];
    const draw = (at: number): string | null => {
      drawn.push(at);
      return at > 20 ? null : `line ${String(at)}`;
    };
    expect([credits.on(), credits.flying()]).toEqual([true, false]);
    credits.frame(1, draw);
    expect([box?.hidden, drawn]).toEqual([true, [0]]);
    credits.frame(titleHold, draw);
    expect([credits.flying(), box?.hidden]).toEqual([true, false]);
    expect(box?.classList.contains("credits")).toBe(true);
    expect(title?.textContent).toBe(creditTitles[0]);
    credits.frame(30, draw);
    expect([credits.on(), box?.hidden, skip?.textContent]).toEqual([
      false,
      true,
      usual,
    ]);
    credits.frame(1, draw);
    credits.stop();
    expect(drawn).toHaveLength(3);
    expect(createCredits(false).on()).toBe(false);
  });

  it("name each of the opening's shots", () => {
    expect(creditTitles).toHaveLength(opening.length);
    expect(shotAt(0)).toBe(0);
    expect(shotAt((opening[0]?.seconds ?? 0) + 0.1)).toBe(1);
    expect(shotAt(9_999)).toBe(opening.length - 1);
  });
});

describe("the thumb stick", () => {
  it("steers true on a tall screen as on a wide one, and leans its knob the way it steers", () => {
    const tall = 9 / 19.5;
    expect(steer({ x: 0.22, y: 0.7 }, tall)).toBe(4);
    expect(steer({ x: 0.4, y: 0.62 }, tall)).toBe(0);
    expect(steer({ x: 0.35, y: 0.77 }, tall)).toBe(3);
    expect(zoneAt("playing", { x: 0.22, y: 0.9 }, tall)).toBe(4);
    const knob = document.querySelector<HTMLElement>("#stick span");
    lean(knob, 4);
    expect([
      knob?.style.getPropertyValue("--east"),
      knob?.style.getPropertyValue("--south"),
    ]).toEqual(["0.00", "1.00"]);
    lean(knob, -1);
    expect(knob?.style.getPropertyValue("--south")).toBe("0");
    lean(null, 3);
  });
});
