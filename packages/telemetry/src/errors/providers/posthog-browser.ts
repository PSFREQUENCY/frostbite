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
import type { ErrorProvider } from "../port.ts";
import { errorOf, propertiesOf } from "./posthog-report.ts";

// Where the platform's own server forwards error reports to the provider (see `apps/web/src/proxy.ts`): the page only ever talks to its own
// origin, so the content policy needs no exception and a blocker has nothing to match.
export const errorIngestPath = "/telemetry/errors";

type Library = Pick<PostHog, "captureException" | "init">;

export type PosthogBrowserDeps = LazyDeps<Library>;

// The settings for error reports: the shared ones (everything off), the platform's own address, no page counting, and every event scrubbed,
// with source lines left alone (the browser adds none).
export function posthogBrowserConfig(
  settings: Pick<ServiceSettings, "allowAutomation">,
): Partial<PostHogConfig> {
  return posthogBrowserBase(settings, {
    api_host: errorIngestPath,
    before_send: (event) => ({
      ...event,
      properties: scrubPostHogRecord(event.properties, {
        dropSourceContext: false,
      }),
    }),
    capture_pageview: false,
  });
}

// Reports to PostHog from the browser. The library loads once the page is idle, and reports that arrive before it is ready wait (a few of
// them) and go when it is. If it cannot load, they are dropped: an error report is never worth a visible failure.
export function createPosthogBrowserErrors(
  settings: ServiceSettings,
  deps: PosthogBrowserDeps = { load: loadPosthog, whenIdle: whenPageIdle },
): ErrorProvider {
  const withClient = lazyClient(deps, (library) => {
    library.init(settings.token ?? "", posthogBrowserConfig(settings));
    return library;
  });
  return {
    captureException(report) {
      withClient((library) => {
        library.captureException(errorOf(report), propertiesOf(report));
      });
    },
    shutdown: () => Promise.resolve(),
  };
}
