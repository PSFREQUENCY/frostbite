# Runbook: error reporting

What this is: the platform reports what breaks (in a page, on the server, in the worker) to an error provider, so someone can see it and be
told. The provider is chosen by settings, not code; PostHog (EU cloud) is the first. The server log stays the record of truth: every report
carries the correlation id of its log line. The design and the reasons are in `docs/posthog-plan.md` (outside the repository) and
`packages/telemetry/README.md`.

## What is sent, and what never is

Sent: the kind of error, its stack lines, a database error's code, the route as a template (`/s/:id`, never the address asked for), the
operation name and correlation id, and a few plain facts the library adds (browser, screen size).

Never sent, and checked by tests: the message of a server error (it can hold a query with the player's own values), wallet addresses,
emails, account or player ids, tokens, run records, scores, query strings, the session cookie, the person's IP address, the page they came
from. A page's reports go to the platform's own address first; the platform strips the cookie, the login, the address and the referrer
before passing them on.

## Settings

| Setting                                        | Where         | Meaning                                                                                                                                 |
| ---------------------------------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_ERROR_REPORTING_PROVIDER`         | build and run | `noop` (or blank): report nothing. `posthog`: report to PostHog. Baked into the browser code, so changing it needs a rebuild.           |
| `NEXT_PUBLIC_ERROR_REPORTING_TOKEN`            | build and run | The provider's public project key. Required for any provider but noop.                                                                  |
| `ERROR_REPORTING_INGEST_ORIGIN`                | run           | Where the provider receives reports (`https://eu.i.posthog.com` for the EU cloud). Required by the server and the worker for `posthog`. |
| `NEXT_PUBLIC_ERROR_REPORTING_ALLOW_AUTOMATION` | build         | `true` only in test builds; refused when `APP_ENV` is preview or production.                                                            |

A setting that cannot work stops the server and the worker at start, naming the setting. The browser never stops for it; it just reports
nothing.

## Setting up PostHog (once)

1. Create a PostHog project on the **EU cloud**. Under the project's settings switch on cookieless mode (without it the page's events are
   dropped), and set a billing limit.
2. Error tracking → Alerting → New notification: issue created or reopened, and spikes, to Slack (connect the Slack integration or paste a
   webhook address). No code is involved.
3. Give the deployment its settings: the project key and `https://eu.i.posthog.com` as the ingest origin, with the provider `posthog`.
4. Look at a real report: cause a harmless error and check it arrives (see below).

## Readable stack traces (source maps)

The browser code is minified, so a report says "line 1, column 38511". The image build tags every browser file with an id (always, offline,
no secret, no release named: naming one makes the tool ask the provider), and the maps are sent to the provider, with the release, by a
separate, optional build:

```
docker build -f deploy/Dockerfile --target sourcemaps \
  --secret id=error_reporting_api_key,env=POSTHOG_API_KEY \
  --secret id=error_reporting_project_id,env=POSTHOG_PROJECT_ID \
  --build-arg RELEASE_VERSION=<the commit being released> .
```

The personal API key needs the error-tracking write scope. Run this next to the build of the image you release (the ids come from the file
contents, so the same build always gives the same ids). Without it the image still builds and runs; reports just are not readable. The maps
are never in the image: the build removes them. The tool is fetched as a release binary whose checksum is pinned in `deploy/Dockerfile`; a
new version needs the new release's checksums.

## Checking it works

In a browser console on the deployed site: `setTimeout(() => { throw new Error("report check") }, 0)`. It should show in the provider within
about a minute (the library sends in batches, and starts once the page is idle). On the server, an internal error answered with a 500
produces a report with the same correlation id as its log line.

## When nothing arrives

- The provider is `noop`, or the key is missing (the server would not have started with a missing key; the browser build may predate the setting).
- Cookieless mode is not switched on in the PostHog project: events are accepted and dropped.
- The visitor sends Do Not Track, or is a robot: both are left out on purpose.
- `ERROR_REPORTING_INGEST_ORIGIN` is not set: the platform answers a page's reports with nothing.
- The error happened before the page was idle, in a tab that was closed at once: the library had not loaded yet.
- A process that is ending cannot always finish sending its last report.

## Changing provider

Change `NEXT_PUBLIC_ERROR_REPORTING_PROVIDER` and the key (and the ingest origin), then rebuild. Not interchangeable: the alert rules and
dashboards live in the provider and are made again there; the source map step in `deploy/Dockerfile` is the provider's own tool; a new
provider needs an adapter in `packages/telemetry/src/errors/providers/` (see its README).
