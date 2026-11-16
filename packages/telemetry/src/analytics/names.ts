// The names an analytics setting may take. A provider is added by its adapter file, its line in the registry (`providers/browser.ts`), and its
// name here; a test holds the registry and this list to each other. Analytics events come from the page (see `browser.ts`), so there is one
// registry.
export const analyticsProviderNames = ["noop", "posthog"] as const;
export type AnalyticsProviderName = (typeof analyticsProviderNames)[number];
