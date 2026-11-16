// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const made = vi.fn();
const captured = vi.fn();
vi.mock("@frostbite/telemetry/analytics/browser", () => ({
  createBrowserAnalytics: (settings: unknown) => {
    made(settings);
    return { capture: captured, shutdown: () => Promise.resolve() };
  },
}));

beforeEach(() => {
  vi.resetModules();
});
afterEach(() => {
  vi.unstubAllEnvs();
  made.mockReset();
  captured.mockReset();
});

async function load() {
  return import("../src/telemetry/browser-analytics");
}

describe("the analytics of a page", () => {
  it("is the provider the build names, made once", async () => {
    vi.stubEnv("NEXT_PUBLIC_ANALYTICS_PROVIDER", "posthog");
    vi.stubEnv("NEXT_PUBLIC_ANALYTICS_TOKEN", "phc_events");
    const { browserAnalytics } = await load();
    expect(browserAnalytics()).toBe(browserAnalytics());
    expect(made).toHaveBeenCalledOnce();
    expect(made.mock.calls[0]?.[0]).toMatchObject({
      provider: "posthog",
      token: "phc_events",
    });
  });

  it("does not read the error reporting's settings", async () => {
    vi.stubEnv("NEXT_PUBLIC_ERROR_REPORTING_PROVIDER", "posthog");
    vi.stubEnv("NEXT_PUBLIC_ERROR_REPORTING_TOKEN", "phc_errors");
    const { browserAnalytics } = await load();
    browserAnalytics();
    expect(made.mock.calls[0]?.[0]).toMatchObject({
      provider: "noop",
      token: null,
    });
  });

  it("is noop, and the page still loads, when the settings cannot work", async () => {
    vi.stubEnv("NEXT_PUBLIC_ANALYTICS_PROVIDER", "mystery");
    const { browserAnalytics } = await load();
    expect(() => browserAnalytics()).not.toThrow();
    expect(made.mock.calls[0]?.[0]).toMatchObject({ provider: "noop" });
  });

  it("lets robots in only when the build says so", async () => {
    vi.stubEnv("NEXT_PUBLIC_ANALYTICS_PROVIDER", "posthog");
    vi.stubEnv("NEXT_PUBLIC_ANALYTICS_TOKEN", "phc_events");
    vi.stubEnv("NEXT_PUBLIC_ANALYTICS_ALLOW_AUTOMATION", "true");
    const { browserAnalytics } = await load();
    browserAnalytics();
    expect(made.mock.calls[0]?.[0]).toMatchObject({ allowAutomation: true });
  });

  it("is made when something is first counted, not when the page is built or rendered, and what is counted reaches it unchanged", async () => {
    const { pageAnalytics } = await load();
    expect(made).not.toHaveBeenCalled();
    pageAnalytics.capture("game_opened", { game: "permafrost" });
    expect(made).toHaveBeenCalledOnce();
    expect(captured).toHaveBeenCalledExactlyOnceWith("game_opened", {
      game: "permafrost",
    });
    await expect(pageAnalytics.shutdown()).resolves.toBeUndefined();
  });

  it("starts counting pages by being made", async () => {
    const { startBrowserAnalytics } = await load();
    startBrowserAnalytics();
    expect(made).toHaveBeenCalledOnce();
  });
});
