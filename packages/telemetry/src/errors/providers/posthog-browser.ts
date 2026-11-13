import type {
  PostHog,
  PostHogConfig,
} from "posthog-js/dist/module.no-external.js";

import type { ServiceSettings } from "../../settings.ts";
import type { ErrorProvider, ErrorReport } from "../port.ts";
import { errorOf, propertiesOf } from "./posthog-report.ts";
import { scrubPostHogRecord } from "./posthog-scrub.ts";

// Where the platform's own server forwards error reports to the provider (see `apps/web/src/proxy.ts`): the page only ever talks to its own
// origin, so the content policy needs no exception and a blocker has nothing to match.
export const errorIngestPath = "/telemetry/errors";
// How many reports wait for the library to load; more than this and the oldest ones are not worth the memory.
const maxWaiting = 20;
// How long the library may wait for the page to be idle before it loads anyway.
const idleTimeoutMs = 3_000;

type Library = Pick<PostHog, "captureException" | "init">;

export interface PosthogBrowserDeps {
  // Brings the library in; the page does not wait for it.
  readonly load: () => Promise<Library>;
  // Runs a function once the page has nothing better to do.
  readonly whenIdle: (run: () => void) => void;
}

// The bundle with every extension built in and none loaded from the provider's asset host at run time: no second address to forward, no
// script from elsewhere. (The slim bundle is under half the size but ignores `captureException`, so it is not an option.) It does not catch uncaught errors itself; `installGlobalErrorHandlers` does, so those pass our scrubber first.
async function loadLibrary(): Promise<Library> {
  return (await import("posthog-js/dist/module.no-external.js")).posthog;
}

function whenIdle(run: () => void): void {
  if (typeof requestIdleCallback === "function")
    requestIdleCallback(run, { timeout: idleTimeoutMs });
  else setTimeout(run, 1);
}

// Everything the library could capture on its own, switched off, and everything the provider's dashboard could switch on, unable to: with
// the flags request off, the library never asks the provider what it should do and runs on this alone. A test pins every line of it.
export function posthogBrowserConfig(
  settings: Pick<ServiceSettings, "allowAutomation">,
): Partial<PostHogConfig> {
  return {
    advanced_disable_flags: true,
    advanced_disable_toolbar_metrics: true,
    api_host: errorIngestPath,
    autocapture: false,
    before_send: (event) => ({
      ...event,
      properties: scrubPostHogRecord(event.properties, {
        dropSourceContext: false,
      }),
    }),
    capture_dead_clicks: false,
    capture_exceptions: false,
    capture_heatmaps: false,
    capture_pageleave: false,
    capture_pageview: false,
    capture_performance: false,
    capture_webmcp: false,
    cookieless_mode: "always",
    disable_conversations: true,
    disable_cookie: true,
    disable_external_dependency_loading: true,
    disable_persistence: true,
    disable_product_tours: true,
    disable_scroll_properties: true,
    disable_session_recording: true,
    disable_surveys: true,
    disable_web_experiments: true,
    mask_all_element_attributes: true,
    mask_all_text: true,
    mask_personal_data_properties: true,
    opt_out_useragent_filter: settings.allowAutomation === true,
    persistence: "memory",
    person_profiles: "identified_only",
    rageclick: false,
    respect_dnt: true,
    save_campaign_params: false,
    save_referrer: false,
  };
}

function send(library: Library, report: ErrorReport): void {
  library.captureException(errorOf(report), propertiesOf(report));
}

// Reports to PostHog from the browser. The library loads once the page is idle, and reports that arrive before it is ready wait (a few of
// them) and go when it is. If it cannot load, they are dropped: an error report is never worth a visible failure.
export function createPosthogBrowserErrors(
  settings: ServiceSettings,
  deps: PosthogBrowserDeps = { load: loadLibrary, whenIdle },
): ErrorProvider {
  const waiting: ErrorReport[] = [];
  let library: Library | null = null;
  let broken = false;
  deps.whenIdle(() => {
    deps
      .load()
      .then((loaded) => {
        loaded.init(settings.token ?? "", posthogBrowserConfig(settings));
        library = loaded;
        for (const report of waiting.splice(0)) send(loaded, report);
      })
      .catch(() => {
        broken = true;
        waiting.length = 0;
      });
  });
  return {
    captureException(report) {
      if (broken) return;
      if (library !== null) send(library, report);
      else if (waiting.length < maxWaiting) waiting.push(report);
    },
    shutdown: () => Promise.resolve(),
  };
}
