import { describe, expect, it } from "vitest";

import { parseTelemetryEnvironment } from "../src/env/telemetry.ts";

const noop = { ingestOrigin: null, provider: "noop", token: null };

describe("the telemetry environment", () => {
  it("is noop for both services while nothing is set, or only blanks are", () => {
    expect(parseTelemetryEnvironment({})).toEqual({
      analytics: noop,
      errorReporting: noop,
    });
    expect(
      parseTelemetryEnvironment({
        NEXT_PUBLIC_ANALYTICS_PROVIDER: "  ",
        NEXT_PUBLIC_ERROR_REPORTING_TOKEN: "",
      }),
    ).toEqual({ analytics: noop, errorReporting: noop });
  });

  it("reads each service from its own keys", () => {
    expect(
      parseTelemetryEnvironment({
        ANALYTICS_INGEST_ORIGIN: " https://analytics.example.com ",
        NEXT_PUBLIC_ANALYTICS_PROVIDER: "noop",
      }),
    ).toEqual({
      analytics: {
        ingestOrigin: "https://analytics.example.com",
        provider: "noop",
        token: null,
      },
      errorReporting: noop,
    });
  });

  it("stops boot naming the key when a provider is not one the platform has", () => {
    expect(() =>
      parseTelemetryEnvironment({ NEXT_PUBLIC_ANALYTICS_PROVIDER: "mystery" }),
    ).toThrow(/NEXT_PUBLIC_ANALYTICS_PROVIDER: Unknown provider "mystery"/u);
    expect(() =>
      parseTelemetryEnvironment({
        NEXT_PUBLIC_ERROR_REPORTING_PROVIDER: "mystery",
      }),
    ).toThrow(/NEXT_PUBLIC_ERROR_REPORTING_PROVIDER: Unknown provider/u);
  });

  it("stops boot naming the key when an ingest origin is not an address", () => {
    expect(() =>
      parseTelemetryEnvironment({ ERROR_REPORTING_INGEST_ORIGIN: "nope" }),
    ).toThrow(/ERROR_REPORTING_INGEST_ORIGIN/u);
  });

  it("keeps one service's mistake from being laid at the other's door", () => {
    expect(() =>
      parseTelemetryEnvironment({ NEXT_PUBLIC_ANALYTICS_PROVIDER: "mystery" }),
    ).not.toThrow(/ERROR_REPORTING/u);
  });

  it("lets robots report only when asked, and only in a test build", () => {
    const plain = parseTelemetryEnvironment({});
    expect(plain.errorReporting).not.toHaveProperty("allowAutomation");
    expect(
      parseTelemetryEnvironment({
        APP_ENV: "test",
        NEXT_PUBLIC_ERROR_REPORTING_ALLOW_AUTOMATION: "true",
      }).errorReporting,
    ).toMatchObject({ allowAutomation: true });
    // The browser has no APP_ENV: the server's start checks it, with the whole environment.
    expect(
      parseTelemetryEnvironment({
        NEXT_PUBLIC_ERROR_REPORTING_ALLOW_AUTOMATION: "true",
      }).errorReporting,
    ).toMatchObject({ allowAutomation: true });
    expect(
      parseTelemetryEnvironment({
        NEXT_PUBLIC_ERROR_REPORTING_ALLOW_AUTOMATION: "false",
      }).errorReporting,
    ).not.toHaveProperty("allowAutomation");
    for (const APP_ENV of ["preview", "production"])
      expect(() =>
        parseTelemetryEnvironment({
          APP_ENV,
          NEXT_PUBLIC_ERROR_REPORTING_ALLOW_AUTOMATION: "true",
        }),
      ).toThrow(/not allowed when APP_ENV is/u);
  });

  it("lets each service be told to admit robots on its own, and refuses it in a deployment people sign in to", () => {
    const analytics = parseTelemetryEnvironment({
      NEXT_PUBLIC_ANALYTICS_ALLOW_AUTOMATION: "true",
    });
    expect(analytics.analytics).toMatchObject({ allowAutomation: true });
    expect(analytics.errorReporting).not.toHaveProperty("allowAutomation");
    const errors = parseTelemetryEnvironment({
      NEXT_PUBLIC_ERROR_REPORTING_ALLOW_AUTOMATION: "true",
    });
    expect(errors.analytics).not.toHaveProperty("allowAutomation");
    for (const APP_ENV of ["preview", "production"])
      expect(() =>
        parseTelemetryEnvironment({
          APP_ENV,
          NEXT_PUBLIC_ANALYTICS_ALLOW_AUTOMATION: "true",
        }),
      ).toThrow(/NEXT_PUBLIC_ANALYTICS_ALLOW_AUTOMATION=true.*not allowed/u);
  });
});
