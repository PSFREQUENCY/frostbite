// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

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
  it("roll over the city once a run has started, and stop for the ring", () => {
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
    expect([credits.on(), credits.flying(), titleHold]).toEqual([
      true,
      true,
      0,
    ]);
    credits.frame(0, draw);
    expect([box?.hidden, drawn]).toEqual([false, [0]]);
    credits.frame(1, draw);
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
