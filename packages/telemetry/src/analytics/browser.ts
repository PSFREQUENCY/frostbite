import type { ServiceSettings } from "../settings.ts";
import { createAnalytics, type AnalyticsOptions } from "./index.ts";
import type { Analytics } from "./port.ts";
import { browserAnalyticsProviders } from "./providers/browser.ts";

export { analyticsIngestPath } from "./providers/posthog-browser.ts";

// The analytics for a page: the provider the setting names. Every event the platform counts happens in the page, where a visit can be told
// from another; a server cannot say which visit an event belongs to, so it would only break the funnels in two.
export function createBrowserAnalytics(
  settings: ServiceSettings,
  options: Partial<AnalyticsOptions> = {},
): Analytics {
  return createAnalytics(settings, {
    registry: browserAnalyticsProviders,
    ...options,
  });
}
