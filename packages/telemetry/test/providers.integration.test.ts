import { describe, expect, it } from "vitest";

import { analyticsProviderNames } from "../src/analytics/names.ts";
import { browserAnalyticsProviders as analyticsProviders } from "../src/analytics/providers/browser.ts";
import { describeError } from "../src/errors/describe.ts";
import { errorProviderNames } from "../src/errors/names.ts";
import { browserErrorProviders } from "../src/errors/providers/browser.ts";
import { serverErrorProviders } from "../src/errors/providers/server.ts";
import type { AnalyticsProviderFactory } from "../src/analytics/port.ts";

// The contract every provider in a registry meets, run against the real registries. A provider that reaches a network is built to be given a
// stand-in for it, so this stays offline: the adapters that do are tested with their stand-ins in their own files.
const settings = (provider: string) => ({
  ingestOrigin: provider === "noop" ? null : "https://ingest.example.com",
  provider,
  token: provider === "noop" ? null : "test-key",
});

describe.each(Object.entries<AnalyticsProviderFactory>(analyticsProviders))(
  "the analytics provider %s",
  (name, factory) => {
    it("takes an event without throwing and closes", async () => {
      const provider = factory(settings(name));
      await expect(
        Promise.resolve(
          provider.capture("run_started", { game: "permafrost" }),
        ),
      ).resolves.toBeUndefined();
      await expect(provider.shutdown()).resolves.toBeUndefined();
    });
  },
);

describe("the analytics registry", () => {
  it("offers exactly the names the setting accepts", () => {
    expect(Object.keys(analyticsProviders).sort()).toEqual(
      [...analyticsProviderNames].sort(),
    );
  });
});

describe("the error-reporting registries", () => {
  it("offer exactly the names the setting accepts, in a page and on the server alike", () => {
    expect(Object.keys(browserErrorProviders).sort()).toEqual(
      [...errorProviderNames].sort(),
    );
    expect(Object.keys(serverErrorProviders).sort()).toEqual(
      [...errorProviderNames].sort(),
    );
  });

  it("run noop without touching anything", async () => {
    for (const registry of [browserErrorProviders, serverErrorProviders]) {
      const provider = registry.noop();
      await expect(
        Promise.resolve(
          provider.captureException(describeError(new Error("x"))),
        ),
      ).resolves.toBeUndefined();
      await expect(provider.shutdown()).resolves.toBeUndefined();
    }
  });
});

describe("the registries", () => {
  it("both offer noop, the provider that runs when nothing is set", () => {
    expect(Object.keys(analyticsProviders)).toContain("noop");
    expect(errorProviderNames).toContain("noop");
  });
});
