// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const installed = vi.fn();
const made = vi.fn();
vi.mock("@frostbite/telemetry/errors/browser", () => ({
  createBrowserErrorReporter: (settings: unknown) => {
    made(settings);
    return { captureException: vi.fn(), shutdown: vi.fn() };
  },
  installGlobalErrorHandlers: installed,
}));

beforeEach(() => {
  vi.resetModules();
});
afterEach(() => {
  vi.unstubAllEnvs();
  installed.mockReset();
  made.mockReset();
});

async function load() {
  return import("../src/telemetry/browser-reporter");
}

describe("the error reporter of a page", () => {
  it("is the one the build names, made once", async () => {
    vi.stubEnv("NEXT_PUBLIC_ERROR_REPORTING_PROVIDER", "posthog");
    vi.stubEnv("NEXT_PUBLIC_ERROR_REPORTING_TOKEN", "phc_test");
    const { browserErrorReporter } = await load();
    expect(browserErrorReporter()).toBe(browserErrorReporter());
    expect(made).toHaveBeenCalledOnce();
    expect(made.mock.calls[0]?.[0]).toMatchObject({
      provider: "posthog",
      token: "phc_test",
    });
  });

  it("is noop when nothing is set", async () => {
    const { browserErrorReporter } = await load();
    browserErrorReporter();
    expect(made.mock.calls[0]?.[0]).toMatchObject({
      provider: "noop",
      token: null,
    });
  });

  it("is noop, and the page still loads, when the settings cannot work", async () => {
    vi.stubEnv("NEXT_PUBLIC_ERROR_REPORTING_PROVIDER", "mystery");
    const { browserErrorReporter } = await load();
    expect(() => browserErrorReporter()).not.toThrow();
    expect(made.mock.calls[0]?.[0]).toMatchObject({ provider: "noop" });
  });

  it("lets robots report only when the build says so", async () => {
    vi.stubEnv("NEXT_PUBLIC_ERROR_REPORTING_PROVIDER", "posthog");
    vi.stubEnv("NEXT_PUBLIC_ERROR_REPORTING_TOKEN", "phc_test");
    vi.stubEnv("NEXT_PUBLIC_ERROR_REPORTING_ALLOW_AUTOMATION", "true");
    const { browserErrorReporter } = await load();
    browserErrorReporter();
    expect(made.mock.calls[0]?.[0]).toMatchObject({ allowAutomation: true });
  });

  it("starts catching what the page throws, against the window, with the page's own path", async () => {
    const { startBrowserErrorReporting } = await load();
    startBrowserErrorReporting();
    expect(installed).toHaveBeenCalledOnce();
    const [, source, route] = installed.mock.calls[0] ?? [];
    expect(source).toBe(window);
    expect((route as () => string)()).toBe(window.location.pathname);
  });
});
