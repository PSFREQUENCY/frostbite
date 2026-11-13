// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { beforeAll, describe, expect, it, vi } from "vitest";

import { createBag, packOf } from "../src/page/bag.ts";
import { handsFor, wireButtons } from "../src/page/hands.ts";
import { createSteer, worldHeading } from "../src/page/steer.ts";
import type { DayState } from "../src/rules/types.ts";
import type { Choice } from "../src/session.ts";
import { painted } from "../src/view/boards.ts";
import { buildLanterns } from "../src/view/lanterns.ts";
import { lanternPaper, murals, posters, streets } from "../src/view/prints.ts";
import { facade, shopfronts } from "../src/view/textures.ts";
import { started } from "./support/replay.ts";

// A 2D context that accepts every drawing call and counts the words written, so painting can run without a real canvas.
const written: string[] = [];
beforeAll(() => {
  const gradient = { addColorStop: () => undefined };
  const context = new Proxy(
    {},
    {
      get: (_, key) =>
        key === "createLinearGradient" || key === "createRadialGradient"
          ? () => gradient
          : key === "fillText"
            ? (text: string) => void written.push(text)
            : () => undefined,
      set: () => true,
    },
  );
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
    () => context as unknown as CanvasRenderingContext2D,
  );
  const body =
    /<body>([\s\S]*)<\/body>/u.exec(
      readFileSync(join(import.meta.dirname, "../index.html"), "utf8"),
    )?.[1] ?? "";
  document.body.innerHTML = body;
});

describe("the painted city", () => {
  it("paints window bays, shop fronts, posters, streets, murals, signs and a lantern's message", () => {
    expect(facade(1, "#8c4a36", "#ff3df2", false)).not.toBeNull();
    expect(facade(1, "#8c4a36", null, true)).not.toBeNull();
    expect(shopfronts(false)).not.toBeNull();
    expect(shopfronts(true)).not.toBeNull();
    expect(posters()).not.toBeNull();
    expect(streets()).not.toBeNull();
    expect(murals()).not.toBeNull();
    expect(painted("GM", "#5beac6").emissiveMap).not.toBeNull();
    expect(lanternPaper("to the moon and back again soon")).not.toBeNull();
    expect(written).toEqual(
      expect.arrayContaining([
        "LUCKY DELI",
        "WAGMI",
        "WEN?",
        "to the moon",
        "GM",
      ]),
    );
    const lanterns = buildLanterns();
    lanterns.write("");
    expect(written).toContain("wagmi");
  });
});

describe("the backpack", () => {
  it("slides open with the quest, what the hero carries, the crew, the seed paper, the letters read and tonight's lantern", () => {
    const day: DayState = {
      ...started(1, 7, 2),
      crew: [0],
      done: ["letter-1", "fit-gloves", "moon", "moon-rock"],
      hot: 50,
      paper: 2,
      tools: 3,
      wish: 4,
    };
    const pack = Object.fromEntries(packOf(day));
    expect(pack.Crew).toHaveLength(1);
    expect(pack["Seed paper"]).toEqual(["under the mattress"]);
    expect(pack["Tools and fits"]).toEqual([
      "The magnet",
      "The vacuum",
      "Frost gloves",
      "A space helmet",
      "A moon rock",
    ]);
    expect(pack.Clues?.[1]).toMatch(/^"I laid the first block/u);
    expect(pack.Tonight).toEqual([
      "Your lantern is up, wishing for a full pocket",
    ]);
    const bag = createBag();
    bag.render(day);
    expect(document.getElementById("bag-items")?.children).toHaveLength(0);
    bag.toggle();
    bag.render(day);
    bag.render(day);
    expect([
      bag.isOpen(),
      document.getElementById("bag")?.classList.contains("open"),
    ]).toEqual([true, true]);
    expect(
      document.getElementById("bag-items")?.querySelectorAll("section"),
    ).toHaveLength(7);
    bag.toggle();
    expect(document.getElementById("bag")?.getAttribute("aria-hidden")).toBe(
      "true",
    );
  });
});

describe("the hands", () => {
  it("steer by the camera and hold the line while a key is held, run on Shift, switch crouch and crawl, jump, and send a lantern's words", () => {
    expect([
      worldHeading(12, -Math.PI / 2),
      worldHeading(12, 0),
      worldHeading(0, 0),
      worldHeading(4, Math.PI),
    ]).toEqual([12, 0, 4, 0]);
    const moves: number[] = [];
    let yaw = -Math.PI / 2;
    const steer = createSteer(
      () => yaw,
      (dir) => moves.push(dir),
    );
    steer(12);
    yaw = 0;
    steer(12);
    steer(0);
    steer(-1);
    expect(moves).toEqual([12, 4, -1]);
    const chosen: Choice[] = [];
    const wishes: string[] = [];
    let day: DayState | null = started(1, 7, 2);
    let jumps = 0;
    const hands = handsFor({
      answers: () => 5,
      bag: () => undefined,
      choose: (choice) => void chosen.push(choice),
      day: () => day,
      jump: () => void (jumps += 1),
      pause: () => undefined,
      running: () => true,
      start: () => undefined,
      tapStart: () => undefined,
      turn: () => undefined,
      wish: (text) => void wishes.push(text),
      wishText: () => "wen moon",
      yaw: () => -Math.PI / 2,
    });
    hands.gait(1, true);
    day = { ...started(1, 7, 2), gait: 1 };
    hands.gait(1, false);
    hands.gait(2);
    day = { ...started(1, 7, 2), gait: 2 };
    hands.gait(2);
    hands.jump();
    hands.act();
    hands.move(8);
    day = { ...started(1, 7, 2), talk: "lantern" };
    hands.jump();
    hands.answer(2);
    hands.no();
    hands.act();
    expect(chosen).toEqual([
      { mode: 1, type: "gait" },
      { mode: 0, type: "gait" },
      { mode: 2, type: "gait" },
      { mode: 0, type: "gait" },
      { type: "act" },
      { dir: 8, type: "move" },
      { choice: 0, type: "pick" },
      { choice: 2, type: "pick" },
      { choice: 4, type: "pick" },
      { choice: 0, type: "pick" },
    ]);
    expect([jumps, wishes]).toEqual([1, ["wen moon", "wen moon", "wen moon"]]);
    day = null;
    hands.gait(1);
    expect(chosen).toHaveLength(10);
    // The buttons under the screen do the same, and the day's buttons come back to be switched on and off.
    day = started(1, 7, 2);
    const buttons = wireButtons(hands);
    expect(buttons.map(({ id }) => id)).toEqual([
      "act",
      "pause",
      "jump",
      "run",
      "duck",
      "crawl",
      "pack",
    ]);
    for (const id of [
      "look",
      "up",
      "down",
      "act",
      "jump",
      "run",
      "duck",
      "crawl",
    ]) {
      const button = document.getElementById(id);
      button?.removeAttribute("disabled");
      button?.click();
    }
    expect(chosen.slice(10)).toEqual([
      { type: "look" },
      { by: 1, type: "lift" },
      { by: -1, type: "lift" },
      { type: "act" },
      { mode: 1, type: "gait" },
      { mode: 2, type: "gait" },
      { mode: 3, type: "gait" },
    ]);
    expect(jumps).toBe(2);
  });
});
