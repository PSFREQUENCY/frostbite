import { recordingRuns } from "@frostbite/test-kit/simulated-game-host";
import { afterEach, describe, expect, it } from "vitest";

import { byId, closeGame, play, settle } from "./support/page.ts";

afterEach(closeGame);

describe("Degen Dungeon, bundled and run against a simulated platform", () => {
  it("connects, and lets the player start only once it has", async () => {
    const { window } = await play();
    await settle();
    // The simulated page has no WebGL, so the game says it is drawing the island flat, and plays on.
    expect(byId(window, "status")?.textContent).toBe(
      "Connected. No 3D here, so the island is drawn flat.",
    );
    expect(byId(window, "start")?.hasAttribute("disabled")).toBe(false);
    expect(byId(window, "act")?.hasAttribute("disabled")).toBe(true);
  });

  it("carries on from the best the platform hands back", async () => {
    const { window } = await play({ best: 41, day: 2, hero: 0 });
    await settle();
    expect(byId(window, "best")?.textContent).toBe("41");
  });

  it("starts a day, says what the hero wakes up to and nothing about the platform, and sends the day once it ends", async () => {
    const recorded = recordingRuns();
    const { stored, window } = await play(
      { best: 0 },
      {},
      { runs: recorded.runs },
    );
    await settle();
    byId(window, "start")?.dispatchEvent(new window.MouseEvent("click"));
    await settle(100);
    expect(byId(window, "note")?.textContent).toBe(
      "You were liquidated overnight, and the movers are already here.",
    );
    expect(byId(window, "act")?.hasAttribute("disabled")).toBe(false);
    // Rally wakes at his own door: the act there is going home, which ends the day.
    byId(window, "act")?.dispatchEvent(new window.MouseEvent("click"));
    await settle(100);
    const start = byId(window, "start");
    expect(start?.textContent).toBe("Another day");
    expect(start?.hasAttribute("hidden")).toBe(false);
    expect(byId(window, "note")?.textContent).not.toMatch(
      /platform|claim|seed/i,
    );
    expect(recorded.submitted).toHaveLength(1);
    expect(recorded.submitted[0]?.runId).toBe("run-1");
    expect(recorded.submitted[0]?.record).toMatchObject({
      claims: ["home-safe"],
      config: { day: 1, hero: 7 },
      seed: 424_242,
    });
    expect(stored.progress).toMatchObject({
      best: 0,
      day: 2,
      hero: 7,
      seen: true,
      slip: false,
    });
  }, 40_000);

  it("sends nothing for a run that was never started", async () => {
    const recorded = recordingRuns();
    const { window } = await play({ best: 0 }, {}, { runs: recorded.runs });
    await settle();
    byId(window, "act")?.dispatchEvent(new window.MouseEvent("click"));
    await settle(100);
    expect(recorded.submitted).toHaveLength(0);
  });

  it("says so when the platform does not answer, and can still be played", async () => {
    const { window } = await play(undefined, {
      loadProgress: async () => {
        throw new Error("down");
      },
    });
    await settle();
    expect(window.document.getElementById("status")?.textContent).toBe(
      "The platform said: unavailable",
    );
    expect(
      window.document.getElementById("start")?.hasAttribute("disabled"),
    ).toBe(false);
  });
});
