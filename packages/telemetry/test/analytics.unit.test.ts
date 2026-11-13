import { describe, expect, it, vi } from "vitest";

import { createAnalytics } from "../src/analytics/index.ts";
import type { AnalyticsProvider } from "../src/analytics/port.ts";
import type { Problem } from "../src/guard.ts";

const settings = {
  ingestOrigin: null,
  provider: "fake",
  token: "token",
} as const;

function fake(overrides: Partial<AnalyticsProvider> = {}) {
  const capture = vi.fn<AnalyticsProvider["capture"]>();
  const provider: AnalyticsProvider = {
    capture,
    shutdown: () => Promise.resolve(),
    ...overrides,
  };
  return { capture, provider };
}

function analyticsOn(provider: AnalyticsProvider, shutdownTimeoutMs = 50) {
  const problems: Problem[] = [];
  const analytics = createAnalytics(settings, {
    onProblem: (problem) => problems.push(problem),
    registry: { fake: () => provider },
    shutdownTimeoutMs,
  });
  return { analytics, problems };
}

describe("analytics", () => {
  it("hands the provider an event that is in the catalogue, by its name and its properties", () => {
    const { capture, provider } = fake();
    analyticsOn(provider).analytics.capture("run_started", {
      game: "permafrost",
    });
    expect(capture).toHaveBeenCalledExactlyOnceWith("run_started", {
      game: "permafrost",
    });
  });

  it("never hands the provider an event that is not allowed, and says so", () => {
    const { capture, provider } = fake();
    const { analytics, problems } = analyticsOn(provider);
    // A caller that got past the compiler (an `any`, a cast) is still stopped.
    Reflect.apply(analytics.capture, analytics, [
      "run_started",
      {
        game: "permafrost",
        address: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
      },
    ]);
    Reflect.apply(analytics.capture, analytics, ["page_scrolled", {}]);
    expect(capture).not.toHaveBeenCalled();
    expect(problems).toEqual(["invalid-event", "invalid-event"]);
  });

  it("does not let an allowed event carry a private value in a text it is allowed to have", () => {
    const { capture, provider } = fake();
    // `reason` allows a short name; a name that happens to look like a hex key is still removed before it leaves.
    analyticsOn(provider).analytics.capture("sign_in_failed", {
      method: "wallet",
      reason: "a1b2c3d4e5f60718293a4b5c6d7e8f90",
    });
    expect(capture).toHaveBeenCalledExactlyOnceWith("sign_in_failed", {
      method: "wallet",
      reason: "[removed]",
    });
  });

  it("contains a provider that throws, and says so", () => {
    const { analytics, problems } = analyticsOn(
      fake({
        capture: () => {
          throw new Error("down");
        },
      }).provider,
    );
    expect(() => {
      analytics.capture("run_started", { game: "permafrost" });
    }).not.toThrow();
    expect(problems).toEqual(["provider-failed"]);
  });

  it("contains a provider that rejects, and says so", async () => {
    const { analytics, problems } = analyticsOn(
      fake({ capture: () => Promise.reject(new Error("down")) }).provider,
    );
    analytics.capture("run_started", { game: "permafrost" });
    await vi.waitFor(() => {
      expect(problems).toEqual(["provider-failed"]);
    });
  });

  it("does not wait for a provider that is slow to take an event", () => {
    const { analytics } = analyticsOn(
      fake({ capture: () => new Promise<void>(() => undefined) }).provider,
    );
    expect(
      analytics.capture("run_started", { game: "permafrost" }),
    ).toBeUndefined();
  });

  it("stops waiting for a provider that will not close, and says so", async () => {
    const { analytics, problems } = analyticsOn(
      fake({ shutdown: () => new Promise<void>(() => undefined) }).provider,
      10,
    );
    await analytics.shutdown();
    expect(problems).toEqual(["shutdown-timed-out"]);
  });

  it("contains a provider whose closing fails", async () => {
    const { analytics, problems } = analyticsOn(
      fake({ shutdown: () => Promise.reject(new Error("down")) }).provider,
    );
    await analytics.shutdown();
    expect(problems).toEqual(["provider-failed"]);
  });

  it("refuses a provider name that is not in the registry", () => {
    expect(() =>
      createAnalytics({ ...settings, provider: "elsewhere" }),
    ).toThrow(/Unknown analytics provider "elsewhere"/u);
  });

  it("is the platform's own noop when none is chosen, and does nothing", async () => {
    const analytics = createAnalytics({
      ingestOrigin: null,
      provider: "noop",
      token: null,
    });
    analytics.capture("run_started", { game: "permafrost" });
    await expect(analytics.shutdown()).resolves.toBeUndefined();
  });
});
