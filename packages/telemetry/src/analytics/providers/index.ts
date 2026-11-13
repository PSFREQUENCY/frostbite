import type { AnalyticsProviderFactory } from "../port.ts";
import { createNoopAnalytics } from "./noop.ts";

// Every analytics provider there is, by the name the setting uses. A provider is added by writing its file and adding its line here.
export const analyticsProviders = {
  noop: createNoopAnalytics,
} as const satisfies Readonly<Record<string, AnalyticsProviderFactory>>;
