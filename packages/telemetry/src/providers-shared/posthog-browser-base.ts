import type {
  PostHog,
  PostHogConfig,
} from "posthog-js/dist/module.no-external.js";

import type { ServiceSettings } from "../settings.ts";

// What the library offers that the platform uses; each service takes the part it needs.
export type PosthogLibrary = Pick<PostHog, "init">;

// The bundle with every extension built in and none loaded from the provider's asset host at run time: no second address to forward, no
// script from elsewhere. (The slim bundle is under half the size but ignores `captureException`, so it is not an option.) It catches
// nothing by itself; the platform's own handlers do, so everything passes our scrubber first.
export async function loadPosthog(): Promise<PostHog> {
  return (await import("posthog-js/dist/module.no-external.js")).posthog;
}

// Runs a function once the page has nothing better to do, or soon after when the page never idles.
const idleTimeoutMs = 3_000;
export function whenPageIdle(run: () => void): void {
  if (typeof requestIdleCallback === "function")
    requestIdleCallback(run, { timeout: idleTimeoutMs });
  else setTimeout(run, 1);
}

// Everything the library could capture on its own, switched off, and everything the provider's dashboard could switch on, unable to: with
// the flags request off, the library never asks the provider what it should do and runs on this alone. Both services start from it, and a
// test pins every line of it. Each service gives only what differs: where its events go, whether pages are counted, and what is scrubbed.
export function posthogBrowserBase(
  settings: Pick<ServiceSettings, "allowAutomation">,
  own: Pick<PostHogConfig, "api_host" | "before_send" | "capture_pageview">,
): Partial<PostHogConfig> {
  return {
    advanced_disable_flags: true,
    advanced_disable_toolbar_metrics: true,
    autocapture: false,
    capture_dead_clicks: false,
    capture_exceptions: false,
    capture_heatmaps: false,
    capture_pageleave: false,
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
    ...own,
  };
}
