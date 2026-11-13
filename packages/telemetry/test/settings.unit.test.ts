import { describe, expect, it } from "vitest";

import { analyticsSettingsSchema } from "../src/analytics/index.ts";
import { errorReportingSettingsSchema } from "../src/errors/index.ts";
import { serviceSettingsSchema } from "../src/settings.ts";

const registry = { noop: 1, vendor: 2 };
const schema = serviceSettingsSchema(registry);

describe("service settings", () => {
  it("accepts noop with nothing else", () => {
    expect(
      schema.parse({ ingestOrigin: null, provider: "noop", token: null }),
    ).toEqual({ ingestOrigin: null, provider: "noop", token: null });
  });

  it("accepts a known provider with its key", () => {
    expect(
      schema.parse({
        ingestOrigin: "https://eu.i.example.com",
        provider: "vendor",
        token: "phc_abc",
      }).provider,
    ).toBe("vendor");
  });

  it("refuses a provider that is not in the registry and names the ones that are", () => {
    const result = schema.safeParse({
      ingestOrigin: null,
      provider: "mystery",
      token: null,
    });
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain("noop, vendor");
  });

  it("refuses a provider that needs a key when there is none", () => {
    const result = schema.safeParse({
      ingestOrigin: null,
      provider: "vendor",
      token: null,
    });
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain(
      "needs its project key",
    );
  });

  it("refuses an ingest origin that is not an address and a key that is empty", () => {
    expect(
      schema.safeParse({ ingestOrigin: "nope", provider: "noop", token: null })
        .success,
    ).toBe(false);
    expect(
      schema.safeParse({ ingestOrigin: null, provider: "vendor", token: "" })
        .success,
    ).toBe(false);
  });

  it("is checked against each service's own registry, which has noop", () => {
    const noop = { ingestOrigin: null, provider: "noop", token: null };
    expect(analyticsSettingsSchema.safeParse(noop).success).toBe(true);
    expect(errorReportingSettingsSchema.safeParse(noop).success).toBe(true);
    expect(
      analyticsSettingsSchema.safeParse({ ...noop, provider: "posthog" })
        .success,
    ).toBe(false);
  });
});
