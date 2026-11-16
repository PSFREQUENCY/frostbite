import { analyticsIngestPath } from "@frostbite/telemetry/analytics/browser";
import { errorIngestPath } from "@frostbite/telemetry/errors/browser";
import { parseEnvironment, parseSecurityEnvironment } from "@repo/config/env";
import { parseTelemetryEnvironment } from "@repo/config/telemetry";
import { NextResponse, type NextRequest } from "next/server";

import { decideIngest } from "./server/telemetry/ingest-proxy";
import {
  contentSecurityPolicy,
  securityHeaders,
  type SecurityContext,
} from "./server/security/headers";

// Runs before every page and API response (not static files) to give each response its security headers and
// a fresh nonce. The policy is also placed on the request, because that is where the framework finds the nonce
// to put on its own scripts; the response carries it under the configured mode (report-only or enforce).
export function proxy(request: NextRequest) {
  // The page's error reports and analytics events go to their providers through here, so the page only ever talks to its own origin; they get
  // no page headers. Each service has its own path and its own provider.
  const ingest = decideIngest(
    {
      headers: request.headers,
      pathname: request.nextUrl.pathname,
      search: request.nextUrl.search,
    },
    [
      {
        origin: () =>
          parseTelemetryEnvironment(process.env).errorReporting.ingestOrigin,
        path: errorIngestPath,
      },
      {
        origin: () =>
          parseTelemetryEnvironment(process.env).analytics.ingestOrigin,
        path: analyticsIngestPath,
      },
    ],
  );
  if (ingest.kind === "drop") return new NextResponse(null, { status: 204 });
  if (ingest.kind === "forward")
    return NextResponse.rewrite(ingest.target, {
      request: { headers: ingest.headers },
    });
  const environment = parseEnvironment(process.env);
  const context: SecurityContext = {
    development: process.env.NODE_ENV === "development",
    nonce: Buffer.from(crypto.randomUUID()).toString("base64"),
    platformIsHttps: environment.PUBLIC_BASE_URL.startsWith("https://"),
    security: parseSecurityEnvironment(process.env),
  };
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", context.nonce);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy(context));
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  for (const [name, value] of securityHeaders(context))
    response.headers.set(name, value);
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|play/).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
