// @vitest-environment jsdom

import type { RunsService } from "@frostbite/game-sdk/host";
import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  claimAt,
  earned,
  fakeApi,
  until,
  wallet,
} from "./support/claims-ui.tsx";
import {
  flush,
  game,
  harness as h,
  mount,
  registerHarness,
  send,
} from "./support/player-harness.tsx";

registerHarness();

const capture = vi.fn();
beforeEach(() => {
  capture.mockClear();
  h.analytics = { capture, shutdown: () => Promise.resolve() };
});
const names = () => capture.mock.calls.map(([name]) => name);
const click = (name: string) =>
  act(async () => {
    [...h.container.querySelectorAll("button")]
      .find((candidate) => candidate.textContent.includes(name))
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });

describe("what the game page counts", () => {
  it("counts a game being opened, once, and says which game and nothing of the player", async () => {
    await mount();
    expect(capture.mock.calls).toEqual([
      ["game_opened", { game: "embedded-game" }],
    ]);
  });

  it("counts a game being opened again only when the page shows another game", async () => {
    await mount();
    await act(async () => h.root.render(<div />));
    expect(names()).toEqual(["game_opened"]);
  });

  it("counts a run being started and finished, as verified when the platform's replay says so", async () => {
    const runId = "5b0c1e7a-6d52-4c0f-9a43-7a3e2f1d8b60";
    const runs: RunsService = {
      start: async () => ({
        expiresAt: "2026-10-16T12:00:00.000Z",
        runId,
        seed: 7,
        status: "started",
      }),
      submit: async () => ({ earned: [], status: "verified" }),
    };
    const { target } = await mount(undefined, {
      game: { ...game, capabilities: ["run:submit"] },
      runsFor: () => runs,
    });
    send(target, "ready", { sdkVersion: 1 }, "a");
    send(target, "run.start", {}, "b");
    send(target, "run.submit", { record: { seed: 7 }, runId }, "c");
    await flush();
    expect(capture.mock.calls.slice(1)).toEqual([
      ["run_started", { game: "embedded-game" }],
      ["run_finished", { game: "embedded-game", verified: true }],
    ]);
  });
});

describe("the claims the game page counts", () => {
  it("counts a claim being started by the player", async () => {
    await earned({ api: fakeApi(), wallet });
    capture.mockClear();
    await click("Claim ");
    await flush();
    expect(capture.mock.calls).toEqual([
      ["milestone_claim_started", { game: "embedded-game" }],
    ]);
  });

  it("counts a claim the platform would not start as failed, with the reason code, and not as started", async () => {
    const api = fakeApi({
      start: vi.fn(async () => ({
        reason: "no-funds" as const,
        status: "unavailable" as const,
      })),
    });
    await earned({ api, wallet });
    capture.mockClear();
    await click("Claim ");
    await flush();
    expect(capture.mock.calls).toEqual([
      ["milestone_claim_failed", { game: "embedded-game", reason: "no-funds" }],
    ]);
  });

  it("counts a claim as succeeded once when it is confirmed, however long the page keeps looking at it afterwards", async () => {
    const answers = [claimAt("claimed"), claimAt("complete")];
    const api = fakeApi({
      refresh: vi.fn(async () => ({
        claim: answers.shift() ?? claimAt("complete"),
        status: "ok" as const,
      })),
    });
    await earned({ api, pollMs: 10, sign: async (t) => t, wallet });
    capture.mockClear();
    await click("Claim ");
    await until(
      () => document.querySelector('[data-claim-state="complete"]') !== null,
      80,
    );
    expect(
      names().filter((name) => name === "milestone_claim_succeeded"),
    ).toHaveLength(1);
    expect(names()).not.toContain("milestone_claim_failed");
  });

  it("counts a claim that failed on the network as failed, once", async () => {
    const api = fakeApi({
      refresh: vi.fn(async () => ({
        claim: claimAt("failed"),
        status: "ok" as const,
      })),
    });
    await earned({ api, pollMs: 10, sign: async (t) => t, wallet });
    capture.mockClear();
    await click("Claim ");
    await until(() => names().includes("milestone_claim_failed"), 80);
    await flush();
    expect(
      capture.mock.calls.filter(([name]) => name === "milestone_claim_failed"),
    ).toEqual([
      ["milestone_claim_failed", { game: "embedded-game", reason: "failed" }],
    ]);
  });
});
