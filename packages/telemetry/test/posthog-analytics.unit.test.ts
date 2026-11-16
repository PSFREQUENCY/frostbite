import { describe, expect, it, vi } from "vitest";

import {
  analyticsClientName,
  analyticsIngestPath,
  createPosthogBrowserAnalytics,
  posthogAnalyticsConfig,
  type PosthogAnalyticsDeps,
} from "../src/analytics/providers/posthog-browser.ts";

const settings = { ingestOrigin: null, provider: "posthog", token: "phc_test" };

function stub() {
  const idle: (() => void)[] = [];
  const capture = vi.fn();
  const init = vi.fn(() => ({ capture }));
  const value: PosthogAnalyticsDeps = {
    load: () => Promise.resolve({ init }),
    whenIdle: (run) => idle.push(run),
  };
  return { capture, idle, init, value };
}

const sent = (config: ReturnType<typeof posthogAnalyticsConfig>) => {
  const filter = config.before_send;
  const run = Array.isArray(filter) ? filter[0] : filter;
  return (event: string, properties: Record<string, unknown>) =>
    run?.({ event, properties, uuid: "u" } as never) ?? null;
};

describe("the PostHog settings for analytics", () => {
  const config = posthogAnalyticsConfig({});

  it("count a page when the address changes, and capture nothing else by itself", () => {
    expect(config).toMatchObject({
      autocapture: false,
      capture_dead_clicks: false,
      capture_heatmaps: false,
      capture_pageleave: false,
      capture_pageview: "history_change",
      capture_performance: false,
      rageclick: false,
    });
  });

  it("keep nothing in the browser, follow nobody, and ask the provider for nothing", () => {
    expect(config).toMatchObject({
      advanced_disable_flags: true,
      cookieless_mode: "always",
      disable_cookie: true,
      disable_persistence: true,
      disable_session_recording: true,
      disable_surveys: true,
      persistence: "memory",
      person_profiles: "identified_only",
      respect_dnt: true,
    });
  });

  it("send to the platform's own address, which is not the one error reports use", () => {
    expect(config.api_host).toBe(analyticsIngestPath);
    expect(analyticsIngestPath).not.toBe("/telemetry/errors");
  });

  it("let a robot in only when the settings say so", () => {
    expect(config.opt_out_useragent_filter).toBe(false);
    expect(
      posthogAnalyticsConfig({ allowAutomation: true })
        .opt_out_useragent_filter,
    ).toBe(true);
  });

  it("let through a page view and the platform's own events, scrubbed, and drop anything else", () => {
    const run = sent(config);
    const view = run("$pageview", {
      $current_url: "https://x.example/s/12345?code=SECRET",
      $pathname: "/s/12345",
    });
    expect(JSON.stringify(view)).not.toContain("SECRET");
    expect(JSON.stringify(view)).not.toContain("12345");
    expect(JSON.stringify(view)).toContain("/s/:id");
    const own = run("run_started", { game: "permafrost", note: "a@b.co" });
    expect(JSON.stringify(own)).not.toContain("a@b.co");
    expect(run("$autocapture", {})).toBeNull();
    expect(run("$exception", {})).toBeNull();
    expect(run("not_in_the_catalogue", {})).toBeNull();
    expect(run("constructor", {})).toBeNull();
  });
});

describe("the PostHog analytics in the browser", () => {
  it("loads the library only once the page is idle, as a client of its own beside the default one", async () => {
    const { idle, init, value } = stub();
    createPosthogBrowserAnalytics(settings, value);
    expect(init).not.toHaveBeenCalled();
    idle[0]?.();
    await vi.waitFor(() => {
      expect(init).toHaveBeenCalledOnce();
    });
    const [token, config, name] = init.mock.calls[0] as unknown as [
      string,
      Record<string, unknown>,
      string,
    ];
    expect(token).toBe("phc_test");
    expect(config).toMatchObject({ capture_pageview: "history_change" });
    expect(name).toBe(analyticsClientName);
  });

  it("sends an event with its properties through the client", async () => {
    const { capture, idle, value } = stub();
    const provider = createPosthogBrowserAnalytics(settings, value);
    idle[0]?.();
    await vi.waitFor(() => {
      expect(capture).not.toHaveBeenCalled();
    });
    await new Promise((resolve) => setTimeout(resolve, 5));
    await provider.capture("run_finished", {
      game: "permafrost",
      verified: true,
    });
    expect(capture).toHaveBeenCalledWith("run_finished", {
      game: "permafrost",
      verified: true,
    });
  });

  it("holds the events that come before the library is ready and sends them when it is", async () => {
    const { capture, idle, value } = stub();
    const provider = createPosthogBrowserAnalytics(settings, value);
    await provider.capture("game_opened", { game: "permafrost" });
    expect(capture).not.toHaveBeenCalled();
    idle[0]?.();
    await vi.waitFor(() => {
      expect(capture).toHaveBeenCalledTimes(1);
    });
  });

  it("drops its events, and says nothing, when the library cannot load", async () => {
    const { capture, idle, value } = stub();
    const provider = createPosthogBrowserAnalytics(settings, {
      ...value,
      load: () => Promise.reject(new Error("blocked")),
    });
    await provider.capture("game_opened", { game: "permafrost" });
    idle[0]?.();
    await new Promise((resolve) => setTimeout(resolve, 10));
    await provider.capture("game_opened", { game: "permafrost" });
    expect(capture).not.toHaveBeenCalled();
    await expect(provider.shutdown()).resolves.toBeUndefined();
  });
});
