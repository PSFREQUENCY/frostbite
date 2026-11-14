import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { config, proxy } from "../src/proxy";

beforeEach(() => {
  vi.stubEnv("APP_ENV", "production");
  vi.stubEnv("PUBLIC_BASE_URL", "https://platform.example.com");
  vi.stubEnv("NEXT_PUBLIC_APP_NAME", "Frostbite");
  vi.stubEnv("R2_ENDPOINT", "https://acct.r2.cloudflarestorage.com");
  vi.stubEnv("SECURITY_CSP_MODE", "");
  vi.stubEnv("TRUSTED_PROXY_HOPS", "");
});
afterEach(() => {
  vi.unstubAllEnvs();
});

const nonceOf = (response: Response) =>
  /nonce-([^']+)/u.exec(
    response.headers.get("Content-Security-Policy") ?? "",
  )?.[1];

describe("the proxy", () => {
  it("gives every response its security headers, with the policy enforced by default", () => {
    const response = proxy(
      new NextRequest("https://platform.example.com/games"),
    );
    expect(response.headers.get("Content-Security-Policy")).toContain(
      "default-src 'self'",
    );
    expect(
      response.headers.get("Content-Security-Policy-Report-Only"),
    ).toBeNull();
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("Strict-Transport-Security")).not.toBeNull();
  });

  it("only reports what the policy would block when the deployment says so", () => {
    vi.stubEnv("SECURITY_CSP_MODE", "report-only");
    const response = proxy(
      new NextRequest("https://platform.example.com/games"),
    );
    expect(
      response.headers.get("Content-Security-Policy-Report-Only"),
    ).toContain("script-src");
    expect(response.headers.get("Content-Security-Policy")).toBeNull();
  });

  it("uses a new nonce for every request, and none is guessable from another", () => {
    const first = nonceOf(
      proxy(new NextRequest("https://platform.example.com/")),
    );
    const second = nonceOf(
      proxy(new NextRequest("https://platform.example.com/")),
    );
    expect(first).toBeDefined();
    expect(first).not.toBe(second);
  });

  it("hands the framework the same policy on the request, so it can put the nonce on its own scripts", () => {
    const response = proxy(new NextRequest("https://platform.example.com/"));
    const forwarded = response.headers.get(
      "x-middleware-request-content-security-policy",
    );
    expect(forwarded).toContain(`nonce-${nonceOf(response) ?? "missing"}`);
    expect(response.headers.get("x-middleware-request-x-nonce")).toBe(
      nonceOf(response),
    );
  });

  it("sends no HTTPS-only headers when the platform itself is plain http", () => {
    vi.stubEnv("PUBLIC_BASE_URL", "http://localhost:3000");
    const response = proxy(new NextRequest("http://localhost:3000/"));
    expect(response.headers.get("Strict-Transport-Security")).toBeNull();
    expect(response.headers.get("Content-Security-Policy")).not.toContain(
      "upgrade-insecure-requests",
    );
  });

  it("leaves out static files and prefetches", () => {
    const [matcher] = config.matcher;
    expect(matcher?.source).toContain("_next/static");
    expect(matcher?.missing?.map(({ key }) => key)).toEqual([
      "next-router-prefetch",
      "purpose",
    ]);
  });

  describe("a page's error reports", () => {
    const report = (headers: Record<string, string> = {}) =>
      new NextRequest("https://platform.example.com/telemetry/errors/e/?ip=0", {
        headers,
        method: "POST",
      });

    it("are sent on to the provider with no page headers and none of the person's, when a provider is set", () => {
      vi.stubEnv("NEXT_PUBLIC_ERROR_REPORTING_PROVIDER", "posthog");
      vi.stubEnv("NEXT_PUBLIC_ERROR_REPORTING_TOKEN", "phc_test");
      vi.stubEnv("ERROR_REPORTING_INGEST_ORIGIN", "https://eu.i.example.com");
      const response = proxy(report({ cookie: "frostbite_session=SECRET" }));
      expect(response.headers.get("x-middleware-rewrite")).toBe(
        "https://eu.i.example.com/e/?ip=0",
      );
      expect(response.headers.get("Content-Security-Policy")).toBeNull();
      expect(response.headers.get("x-middleware-request-cookie")).toBeNull();
    });

    it("are answered with nothing when no provider is set", () => {
      const response = proxy(report());
      expect(response.status).toBe(204);
      expect(response.headers.get("x-middleware-rewrite")).toBeNull();
    });

    it("cannot be brought down by a mistake in the error-reporting settings for any page", () => {
      vi.stubEnv("NEXT_PUBLIC_ERROR_REPORTING_PROVIDER", "mystery");
      expect(() =>
        proxy(new NextRequest("https://platform.example.com/games")),
      ).not.toThrow();
      expect(() => proxy(report())).toThrow(/Unknown provider/u);
    });
  });

  describe("a page's analytics events", () => {
    const event = () =>
      new NextRequest("https://platform.example.com/telemetry/events/e/?ip=0", {
        headers: { cookie: "frostbite_session=SECRET" },
        method: "POST",
      });

    it("are sent on to the analytics provider's address, whatever the error reporting is set to", () => {
      vi.stubEnv("NEXT_PUBLIC_ANALYTICS_PROVIDER", "posthog");
      vi.stubEnv("NEXT_PUBLIC_ANALYTICS_TOKEN", "phc_events");
      vi.stubEnv("ANALYTICS_INGEST_ORIGIN", "https://events.example.com");
      const response = proxy(event());
      expect(response.headers.get("x-middleware-rewrite")).toBe(
        "https://events.example.com/e/?ip=0",
      );
      expect(response.headers.get("x-middleware-request-cookie")).toBeNull();
    });

    it("are answered with nothing when analytics has no provider, even if errors do", () => {
      vi.stubEnv("NEXT_PUBLIC_ERROR_REPORTING_PROVIDER", "posthog");
      vi.stubEnv("NEXT_PUBLIC_ERROR_REPORTING_TOKEN", "phc_test");
      vi.stubEnv("ERROR_REPORTING_INGEST_ORIGIN", "https://eu.i.example.com");
      expect(proxy(event()).status).toBe(204);
    });
  });
});
