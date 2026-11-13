import { describe, expect, it, vi } from "vitest";

import { describeError } from "../src/errors/describe.ts";
import {
  createPosthogBrowserErrors,
  errorIngestPath,
  posthogBrowserConfig,
  type PosthogBrowserDeps,
} from "../src/errors/providers/posthog-browser.ts";

const settings = { ingestOrigin: null, provider: "posthog", token: "phc_test" };
const report = describeError(new Error("boom for a@b.co"), {
  correlationId: "c-1",
  operationId: "games.get",
  release: "abc1234",
  route: "/s/9f1c2d3e-aaaa-bbbb-cccc-1234567890ab",
});

function library() {
  return {
    captureException: vi.fn(),
    init: vi.fn(),
  };
}
function deps(overrides: Partial<PosthogBrowserDeps> = {}) {
  const idle: (() => void)[] = [];
  const lib = library();
  const value: PosthogBrowserDeps = {
    load: () => Promise.resolve(lib),
    whenIdle: (run) => idle.push(run),
    ...overrides,
  };
  return { idle, lib, value };
}

describe("the PostHog settings for the browser", () => {
  const config = posthogBrowserConfig({});

  it("switch off everything the library could capture on its own", () => {
    expect(config).toMatchObject({
      autocapture: false,
      capture_dead_clicks: false,
      capture_exceptions: false,
      capture_heatmaps: false,
      capture_pageleave: false,
      capture_pageview: false,
      capture_performance: false,
      capture_webmcp: false,
      disable_session_recording: true,
      disable_surveys: true,
      disable_web_experiments: true,
      rageclick: false,
      save_campaign_params: false,
      save_referrer: false,
    });
  });

  it("stop the dashboard from switching anything on: no flags request, no scripts from the provider, nothing kept in the browser", () => {
    expect(config).toMatchObject({
      advanced_disable_flags: true,
      cookieless_mode: "always",
      disable_cookie: true,
      disable_external_dependency_loading: true,
      disable_persistence: true,
      persistence: "memory",
      person_profiles: "identified_only",
    });
  });

  it("send to the platform's own address, mask what is on the page, and respect Do Not Track", () => {
    expect(config).toMatchObject({
      api_host: errorIngestPath,
      mask_all_element_attributes: true,
      mask_all_text: true,
      respect_dnt: true,
    });
  });

  it("let a browser that announces itself as a robot report only when the settings say so", () => {
    expect(config.opt_out_useragent_filter).toBe(false);
    expect(
      posthogBrowserConfig({ allowAutomation: true }).opt_out_useragent_filter,
    ).toBe(true);
  });

  it("scrub every event on its way out, however deep the private text is", () => {
    const sent = config.before_send;
    const event = {
      event: "$exception",
      properties: {
        $current_url: "https://x.example/s/12345?code=SECRET",
        $exception_list: [{ value: "uncaught for a@b.co" }],
      },
      uuid: "u",
    };
    const result = (Array.isArray(sent) ? sent[0] : sent)?.(event as never);
    expect(JSON.stringify(result)).not.toContain("a@b.co");
    expect(JSON.stringify(result)).not.toContain("SECRET");
  });
});

describe("the PostHog error reporter in the browser", () => {
  it("loads the library only once the page is idle, and starts it with the project key and the pinned settings", async () => {
    const { idle, lib, value } = deps();
    createPosthogBrowserErrors(settings, value);
    expect(lib.init).not.toHaveBeenCalled();
    idle[0]?.();
    await vi.waitFor(() => {
      expect(lib.init).toHaveBeenCalledOnce();
    });
    expect(lib.init.mock.calls[0]?.[0]).toBe("phc_test");
    expect(lib.init.mock.calls[0]?.[1]).toMatchObject({ autocapture: false });
  });

  it("sends a report as an error carrying the scrubbed message, the frames and the platform's ids", async () => {
    const { idle, lib, value } = deps();
    const provider = createPosthogBrowserErrors(settings, value);
    idle[0]?.();
    await vi.waitFor(() => {
      expect(lib.init).toHaveBeenCalled();
    });
    await provider.captureException(report);
    const [error, properties] = lib.captureException.mock.calls[0] ?? [];
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("boom for [removed]");
    expect(properties).toEqual({
      app_release: "abc1234",
      correlation_id: "c-1",
      operation_id: "games.get",
      route: "/s/:id",
    });
  });

  it("holds the reports that come before the library is ready and sends them when it is", async () => {
    const { idle, lib, value } = deps();
    const provider = createPosthogBrowserErrors(settings, value);
    await provider.captureException(report);
    await provider.captureException(report);
    expect(lib.captureException).not.toHaveBeenCalled();
    idle[0]?.();
    await vi.waitFor(() => {
      expect(lib.captureException).toHaveBeenCalledTimes(2);
    });
  });

  it("holds only a few, and drops the rest", async () => {
    const { idle, lib, value } = deps();
    const provider = createPosthogBrowserErrors(settings, value);
    for (let count = 0; count < 50; count += 1)
      await provider.captureException(report);
    idle[0]?.();
    await vi.waitFor(() => {
      expect(lib.captureException).toHaveBeenCalledTimes(20);
    });
  });

  it("drops its reports, and says nothing, when the library cannot load", async () => {
    const { idle, lib, value } = deps({
      load: () => Promise.reject(new Error("blocked")),
    });
    const provider = createPosthogBrowserErrors(settings, value);
    await provider.captureException(report);
    idle[0]?.();
    await new Promise((resolve) => setTimeout(resolve, 10));
    await provider.captureException(report);
    expect(lib.captureException).not.toHaveBeenCalled();
    await expect(provider.shutdown()).resolves.toBeUndefined();
  });
});
