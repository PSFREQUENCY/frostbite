// A path under the platform's own address that a page's reports arrive at, and where the settings say they go on to.
export interface IngestRoute {
  readonly path: string;
  // Asked only for a request to this path, so a mistake in the settings can never touch a page.
  readonly origin: () => string | null;
}

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
  // Not a report or an event: carry on as for any page.
  | { readonly kind: "not-ingest" }
  // One for a service with no provider to send it to: answered with nothing.
  | { readonly kind: "drop" }
  // One for the provider, at this address, with these headers.
  | {
      readonly headers: Headers;
      readonly kind: "forward";
      readonly target: URL;
    };

// Whether a request is a report or an event from the page, and where it goes. Each service's traffic arrives under a path of the platform's own so
// the content policy needs no exception; this sends it on to that service's provider, from settings read for this request.
export function decideIngest(
  request: {
    readonly headers: Headers;
    readonly pathname: string;
    readonly search: string;
  },
  routes: readonly IngestRoute[],
): IngestDecision {
  const route = routes.find(
    ({ path }) =>
      request.pathname === path || request.pathname.startsWith(`${path}/`),
  );
  if (route === undefined) return { kind: "not-ingest" };
  const origin = route.origin();
  if (origin === null) return { kind: "drop" };
  const headers = new Headers(request.headers);
  for (const name of withheld) headers.delete(name);
  return {
    headers,
    kind: "forward",
    target: new URL(
      request.pathname.slice(route.path.length) + request.search,
      origin,
    ),
  };
}
