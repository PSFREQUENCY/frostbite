// @vitest-environment jsdom

import { AnalyticsProvider } from "@frostbite/client-react";
import { click, mount, settle } from "@frostbite/test-kit/dom";
import { describe, expect, it, vi } from "vitest";

import type { LeaderboardApi } from "../src/client/leaderboard-api.ts";
import { Leaderboard } from "../src/ui/leaderboard.tsx";

const api: LeaderboardApi = {
  board: vi.fn(async () => ({ endsAt: null, entries: [], players: 0 })),
  mine: vi.fn(async () => null),
};

describe("what the leaderboard counts", () => {
  it("counts a board being looked at when it opens, and again for each period chosen, by game and period alone", async () => {
    const capture = vi.fn();
    const container = await mount(
      <AnalyticsProvider
        analytics={{ capture, shutdown: async () => undefined }}
      >
        <Leaderboard api={api} gameId="arcade" />
      </AnalyticsProvider>,
    );
    await settle(() => expect(capture).toHaveBeenCalledTimes(1));
    expect(capture).toHaveBeenLastCalledWith("leaderboard_viewed", {
      game: "arcade",
      window: "all",
    });
    const week = [...container.querySelectorAll("button")].find(
      (candidate) => candidate.getAttribute("aria-pressed") === "false",
    );
    click(week ?? null);
    await settle(() => expect(capture).toHaveBeenCalledTimes(2));
    expect(capture.mock.calls[1]?.[0]).toBe("leaderboard_viewed");
    expect(capture.mock.calls[1]?.[1]).not.toEqual({
      game: "arcade",
      window: "all",
    });
  });

  it("counts nothing more when the board shows again with nothing chosen", async () => {
    const capture = vi.fn();
    const container = await mount(
      <AnalyticsProvider
        analytics={{ capture, shutdown: async () => undefined }}
      >
        <Leaderboard api={api} gameId="arcade" />
      </AnalyticsProvider>,
    );
    await settle(() => expect(capture).toHaveBeenCalledTimes(1));
    expect(container.querySelectorAll("[aria-pressed=true]")).toHaveLength(1);
    expect(capture).toHaveBeenCalledTimes(1);
  });
});
