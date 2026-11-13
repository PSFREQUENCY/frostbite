import { describe, expect, it } from "vitest";

import type { AnalyticsProviderFactory } from "../src/analytics/port.ts";
import type { ErrorProviderFactory } from "../src/errors/port.ts";
import { analyticsProviders } from "../src/analytics/providers/index.ts";
import { errorProviders } from "../src/errors/providers/index.ts";
import { describeError } from "../src/errors/describe.ts";

// The contract every provider in a registry meets, run against the real registries: a provider added later is held to it the day its line is
// added, without anyone writing a test for it. A provider that needs a network must be built to be given a stand-in, so this stays offline.
const settings = (provider: string) => ({
  ingestOrigin: null,
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

describe.each(Object.entries<ErrorProviderFactory>(errorProviders))(
  "the error-reporting provider %s",
  (name, factory) => {
    it("takes a report without throwing and closes", async () => {
      const provider = factory(settings(name));
      await expect(
        Promise.resolve(
          provider.captureException(describeError(new Error("x"))),
        ),
      ).resolves.toBeUndefined();
      await expect(provider.shutdown()).resolves.toBeUndefined();
    });
  },
);

describe("the registries", () => {
  it("both offer noop, the provider that runs when nothing is set", () => {
    expect(Object.keys(analyticsProviders)).toContain("noop");
    expect(Object.keys(errorProviders)).toContain("noop");
  });
});
