import type { AnalyticsProviderName } from "../names.ts";
import type { AnalyticsProviderFactory } from "../port.ts";
import { createNoopAnalytics } from "./noop.ts";
import { createPosthogBrowserAnalytics } from "./posthog-browser.ts";

// Every analytics provider there is, by the name the setting uses. A provider is added by writing its file and adding its line here.
export const browserAnalyticsProviders = {
  noop: createNoopAnalytics,
  posthog: (settings) => createPosthogBrowserAnalytics(settings),
} as const satisfies Readonly<
  Record<AnalyticsProviderName, AnalyticsProviderFactory>
>;
