import { errorIngestPath } from "@frostbite/telemetry/errors/browser";

// Headers that would tell the provider who the person is or where they came from. The page talks to its own server, so the browser sends it
// the session cookie and the rest; none of that goes on to the provider.
const withheld = [
  "authorization",
  "cookie",
  "forwarded",
  "origin",
  "referer",
  "x-forwarded-for",
  "x-forwarded-host",
  "x-forwarded-proto",
  "x-real-ip",
] as const;

export type IngestDecision =
  // Not a report: carry on as for any page.
  | { readonly kind: "not-ingest" }
  // A report, and no provider to send it to: answered with nothing.
  | { readonly kind: "drop" }
  // A report for the provider, at this address, with these headers.
  | {
      readonly headers: Headers;
      readonly kind: "forward";
      readonly target: URL;
    };

// Whether a request is an error report from the page, and where it goes. The page's reports arrive under the platform's own path so the
// content policy needs no exception; this sends them on to the provider's ingest address, from settings read for this request.
export function decideIngest(
  request: {
    readonly headers: Headers;
    readonly pathname: string;
    readonly search: string;
  },
  // Asked only for a report, so a mistake in these settings can never touch a page.
  ingestOrigin: () => string | null,
): IngestDecision {
  const inside =
    request.pathname === errorIngestPath ||
    request.pathname.startsWith(`${errorIngestPath}/`);
  if (!inside) return { kind: "not-ingest" };
  const origin = ingestOrigin();
  if (origin === null) return { kind: "drop" };
  const headers = new Headers(request.headers);
  for (const name of withheld) headers.delete(name);
  return {
    headers,
    kind: "forward",
    target: new URL(
      request.pathname.slice(errorIngestPath.length) + request.search,
      origin,
    ),
  };
}
