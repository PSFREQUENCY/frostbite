import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
});
afterEach(() => {
  vi.unstubAllEnvs();
});

async function load() {
  return import("../src/server/telemetry/reporter");
}

describe("the error reporter of this server", () => {
  it("is noop, and one reporter, when no provider is set", async () => {
    const { serverErrorReporter } = await load();
    const reporter = serverErrorReporter();
    expect(serverErrorReporter()).toBe(reporter);
    expect(() => {
      reporter.captureException(new Error("x"));
    }).not.toThrow();
    await expect(reporter.shutdown()).resolves.toBeUndefined();
  });

  it("stops, naming the setting, when posthog is named and there is no address to report to", async () => {
    vi.stubEnv("NEXT_PUBLIC_ERROR_REPORTING_PROVIDER", "posthog");
    vi.stubEnv("NEXT_PUBLIC_ERROR_REPORTING_TOKEN", "phc_test");
    const { serverErrorReporter } = await load();
    expect(() => serverErrorReporter()).toThrow(
      /ERROR_REPORTING_INGEST_ORIGIN/u,
    );
  });

  it("stops, naming the setting, when a provider is named that needs a key and has none", async () => {
    vi.stubEnv("NEXT_PUBLIC_ERROR_REPORTING_PROVIDER", "posthog");
    vi.stubEnv("ERROR_REPORTING_INGEST_ORIGIN", "https://eu.i.example.com");
    const { serverErrorReporter } = await load();
    expect(() => serverErrorReporter()).toThrow(
      /NEXT_PUBLIC_ERROR_REPORTING_TOKEN/u,
    );
  });

  it("makes a working posthog reporter when it has a key and an address, and closes without waiting on a provider that cannot be reached", async () => {
    vi.stubEnv("NEXT_PUBLIC_ERROR_REPORTING_PROVIDER", "posthog");
    vi.stubEnv("NEXT_PUBLIC_ERROR_REPORTING_TOKEN", "phc_test");
    // Nothing listens here: the report cannot be delivered, and that must not matter.
    vi.stubEnv("ERROR_REPORTING_INGEST_ORIGIN", "http://127.0.0.1:1");
    const { serverErrorReporter } = await load();
    const reporter = serverErrorReporter();
    expect(() => {
      reporter.captureException(new Error("x"));
    }).not.toThrow();
    await expect(reporter.shutdown()).resolves.toBeUndefined();
  });
});
