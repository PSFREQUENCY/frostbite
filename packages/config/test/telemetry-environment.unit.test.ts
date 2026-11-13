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
});
