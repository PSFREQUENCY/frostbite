import type {
  PostHog,
  PostHogConfig,
} from "posthog-js/dist/module.no-external.js";

import {
  loadPosthog,
  posthogBrowserBase,
  whenPageIdle,
} from "../../providers-shared/posthog-browser-base.ts";
import {
  lazyClient,
  type LazyDeps,
} from "../../providers-shared/posthog-lazy.ts";
import { scrubPostHogRecord } from "../../providers-shared/posthog-scrub.ts";
import type { ServiceSettings } from "../../settings.ts";
import { analyticsEvents } from "../catalogue.ts";
import type { AnalyticsProvider } from "../port.ts";

// Where the platform's own server forwards analytics events to the provider (see `apps/web/src/proxy.ts`). It is not the path error reports
// use, so each service can have its own provider; the page only ever talks to its own origin.
export const analyticsIngestPath = "/telemetry/events";
// The library keeps one default client, which error reporting uses; analytics is a client of its own beside it, so the two settings can name
// different providers and neither starts the other's capture.
export const analyticsClientName = "analytics";
// The one event the library sends by itself: a page was shown.
const pageView = "$pageview";

// What is asked of the library: a client made under a name, which can capture an event.
type Client = Pick<PostHog, "capture">;
interface Library {
  init(token: string, config: Partial<PostHogConfig>, name: string): Client;
}

export type PosthogAnalyticsDeps = LazyDeps<Library>;

// The settings for analytics: the shared ones (everything off), the platform's own address, a page counted when the address changes, and every
// event scrubbed. An event that is neither the page view nor in the catalogue is dropped here too, the last check before it leaves.
export function posthogAnalyticsConfig(
  settings: Pick<ServiceSettings, "allowAutomation">,
): Partial<PostHogConfig> {
  return posthogBrowserBase(settings, {
    api_host: analyticsIngestPath,
    before_send: (event) =>
      event.event === pageView || Object.hasOwn(analyticsEvents, event.event)
        ? {
            ...event,
            properties: scrubPostHogRecord(event.properties, {
              dropSourceContext: false,
            }),
          }
        : null,
    capture_pageview: "history_change",
  });
}

// Sends analytics events to PostHog from the browser. The library loads once the page is idle, and events that arrive before it is ready wait
// (a few of them) and go when it is. If it cannot load, they are dropped: an event is never worth a visible failure. Pages are counted from
// the moment the library starts.
export function createPosthogBrowserAnalytics(
  settings: ServiceSettings,
  deps: PosthogAnalyticsDeps = { load: loadPosthog, whenIdle: whenPageIdle },
): AnalyticsProvider {
  const withClient = lazyClient<Library, Client>(deps, (library) =>
    library.init(
      settings.token ?? "",
      posthogAnalyticsConfig(settings),
      analyticsClientName,
    ),
  );
  return {
    capture(name, properties) {
      withClient((client) => {
        client.capture(name, properties);
      });
    },
    shutdown: () => Promise.resolve(),
  };
}
