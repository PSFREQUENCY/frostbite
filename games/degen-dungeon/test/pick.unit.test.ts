// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { join as joinPath } from "node:path";

import {
  GameHostError,
  type createGameClient,
} from "@frostbite/game-sdk/client";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { titleGuide } from "../src/guide.ts";
import { join } from "../src/page/connect.ts";
import { createPick } from "../src/page/pick.ts";
import { freshProgress } from "../src/progress.ts";

beforeAll(() => {
  document.body.innerHTML =
    /<body>([\s\S]*)<\/body>/u.exec(
      readFileSync(joinPath(import.meta.dirname, "../index.html"), "utf8"),
    )?.[1] ?? "";
});
afterEach(() => vi.unstubAllGlobals());

describe("the hero ring's card", () => {
  it("shows a hero's words for keys or for fingers, and goes away", () => {
    const pick = createPick();
    const box = document.getElementById("pick");
    pick.show(titleGuide);
    expect(box?.hidden).toBe(false);
    expect(document.getElementById("pick-name")?.textContent).toBe(
      "A FROSTBITE ARCADE GAME",
    );
    expect(document.getElementById("pick-start")?.textContent).toBe(
      "ENTER TO PLAY",
    );
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    pick.show({ ...titleGuide, touchLines: ["ONE", "TWO", "THREE"] });
    expect(document.getElementById("pick-lines")?.textContent).toBe(
      "TWO\nTHREE",
    );
    expect(document.getElementById("pick-start")?.textContent).toBe(
      "TAP TO PLAY",
    );
    pick.show(null);
    expect(box?.hidden).toBe(true);
  });
});

describe("joining the platform", () => {
  it("says what went wrong and plays on with a fresh save", async () => {
    const failing = (error: Error) =>
      ({
        ready: () => Promise.reject(error),
      }) as unknown as ReturnType<typeof createGameClient>;
    const refused = await join(
      failing(new GameHostError("permission_denied", "no")),
      true,
    );
    expect([refused.status, refused.play, refused.progress]).toEqual([
      "The platform said: permission_denied",
      null,
      freshProgress,
    ]);
    const lost = await join(failing(new Error("gone")), false);
    expect(lost.status).toBe(
      "Could not connect to the platform. You can still play.",
    );
  });
});
