import type { AnalyticsProvider } from "../port.ts";

// Reports nothing. It is what runs when no provider is set, in local runs and in tests, and what a provider that cannot start falls back to.
export function createNoopAnalytics(): AnalyticsProvider {
  return {
    capture: () => undefined,
    shutdown: () => Promise.resolve(),
  };
}
