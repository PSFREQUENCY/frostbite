import { describe, expect, it, vi } from "vitest";

import { createAnalytics } from "../src/analytics/index.ts";
import type { AnalyticsProvider } from "../src/analytics/port.ts";
import { createErrorReporter } from "../src/errors/index.ts";
import type { ErrorProvider } from "../src/errors/port.ts";

// Two providers the platform does not have, standing in for the vendors that will come: the point is that choosing between them is a
// setting, and that choosing for one service leaves the other as it was.
function analyticsVendor() {
  const capture = vi.fn<AnalyticsProvider["capture"]>();
  return {
    capture,
    factory: (): AnalyticsProvider => ({
      capture,
      shutdown: () => Promise.resolve(),
    }),
  };
}
function errorVendor() {
  const captureException = vi.fn<ErrorProvider["captureException"]>();
  return {
    captureException,
    factory: (): ErrorProvider => ({
      captureException,
      shutdown: () => Promise.resolve(),
    }),
  };
}
const choose = (provider: string) => ({
  ingestOrigin: null,
  provider,
  token: "key",
});

describe("choosing providers by setting", () => {
  it("sends analytics to whichever provider the analytics setting names, and nothing to the other", () => {
    const first = analyticsVendor();
    const second = analyticsVendor();
    const registry = { first: first.factory, second: second.factory };
    createAnalytics(choose("first"), { registry }).capture("run_started", {
      game: "g",
    });
    createAnalytics(choose("second"), { registry }).capture("game_opened", {
      game: "g",
    });
    expect(first.capture).toHaveBeenCalledExactlyOnceWith("run_started", {
      game: "g",
    });
    expect(second.capture).toHaveBeenCalledExactlyOnceWith("game_opened", {
      game: "g",
    });
  });

  it("changes the error reporter's provider without touching analytics, and the other way round", () => {
    const analytics = analyticsVendor();
    const errorsA = errorVendor();
    const errorsB = errorVendor();
    const analyticsRegistry = { analytics: analytics.factory };
    const errorRegistry = { a: errorsA.factory, b: errorsB.factory };

    const stable = createAnalytics(choose("analytics"), {
      registry: analyticsRegistry,
    });
    const first = createErrorReporter(choose("a"), { registry: errorRegistry });
    first.captureException(new Error("one"));
    stable.capture("run_started", { game: "g" });

    // The error setting changes from a to b; the analytics setting is not touched.
    const second = createErrorReporter(choose("b"), {
      registry: errorRegistry,
    });
    second.captureException(new Error("two"));
    stable.capture("run_started", { game: "g" });

    expect(errorsA.captureException).toHaveBeenCalledOnce();
    expect(errorsB.captureException).toHaveBeenCalledOnce();
    expect(analytics.capture).toHaveBeenCalledTimes(2);
  });
});
