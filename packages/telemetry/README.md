# `@frostbite/telemetry`

How the platform reports on itself: **analytics** (what people do) and **error reporting** (what breaks). They are two services with two
ports, two provider registries and two settings, so either can change vendor without the other. No other package imports a vendor SDK
(`pnpm repository:check` enforces it); everything calls the ports here. The plan, the reasons and the phases are in
`docs/posthog-plan.md`.

## Public API

- `@frostbite/telemetry/analytics`: `createAnalytics(settings, options?)` returns `{ capture(name, properties), shutdown() }`.
  `analyticsEvents` is the closed list of events and the only properties each may carry; `analyticsProviders` is the registry
  (`{ noop }` today); `analyticsSettingsSchema` checks a service's settings against it.
- `@frostbite/telemetry/errors`: the vendor-free part: `createErrorReporter(settings, { registry, describe?, onProblem? })`, `describeError`
  (turns anything thrown into a report: the kind, a scrubbed message or none, a database code, the top stack lines, the platform's ids and the
  route as a template), the report types, and `errorProviderNames` (the names a setting may take).
- `@frostbite/telemetry/errors/browser`: for a page: `createBrowserErrorReporter(settings)` and `installGlobalErrorHandlers(reporter, window,
route)`, which reports what a page throws and does not catch. The PostHog library is brought in once the page is idle.
- `@frostbite/telemetry/errors/server`: for the server and the worker: `createServerErrorReporter(settings)` (a server report has **no message**:
  it can carry a query with the player's own values) and `installProcessErrorMonitor(reporter, process)`.
- `@frostbite/telemetry/scrubber`: `scrubText`, `scrubPath`, `scrubUrl`, `scrubProperties`: remove emails, wallet addresses, hex keys and
  transaction ids, uuids and tokens; make a path anonymous (`/s/:id`); drop a query and a hash.
- `@frostbite/telemetry/settings`: `ServiceSettings` (`provider`, `token`, `ingestOrigin`), `noopProvider`, `serviceSettingsSchema`.
- Options (both services): `registry` (the providers to choose from; tests bring their own), `onProblem` (told `invalid-event`,
  `provider-failed` or `shutdown-timed-out`), `shutdownTimeoutMs` (default `defaultShutdownTimeoutMs`).

## Adding a provider

Write the adapter in `src/analytics/providers/` and/or `src/errors/providers/` (a vendor may serve only one; error reporting has a file for
the browser and one for the server), implementing the provider interface in the service's `port.ts`, and add its line to the registry
(analytics: `analytics/providers/index.ts`; errors: `errors/providers/browser.ts` and `server.ts`, and its name in `errors/names.ts`). Its name is
then a valid value for the setting. The
integration test runs every registered provider against the contract. Vendor imports are allowed in those folders and in
`src/providers-shared/` and nowhere else.

## Invariants

- An event not in the catalogue, or carrying a property it does not allow, never reaches a provider.
- Everything leaving is scrubbed first, whatever the provider; privacy does not depend on the vendor.
- A provider that throws, rejects or hangs changes nothing for the caller: `capture` and `captureException` never throw and never wait;
  `shutdown` stops waiting after the timeout.
- With no setting both services are `noop` and report nothing. A name that is not in the registry, or a provider that needs a project key and
  has none, stops boot (see `parseTelemetryEnvironment` in `@repo/config`).
- No account id, wallet address, email, token, signature, run record or query string is in the catalogue or survives the scrubber.

## Configuration

Read by `parseTelemetryEnvironment` (`packages/config/src/env/telemetry.ts`): `NEXT_PUBLIC_ANALYTICS_PROVIDER`,
`NEXT_PUBLIC_ANALYTICS_TOKEN`, `ANALYTICS_INGEST_ORIGIN`, `NEXT_PUBLIC_ERROR_REPORTING_PROVIDER`, `NEXT_PUBLIC_ERROR_REPORTING_TOKEN`,
`ERROR_REPORTING_INGEST_ORIGIN`. Blank means noop. The browser values are baked in at build time.

## Dependencies

`zod`. Nothing else; it must stay usable in the browser, on the server and in the worker.

## Testing

`pnpm --filter @frostbite/telemetry test:unit`, `test:integration`, `test:coverage`, `typecheck`, `lint`.

## Ownership

The platform team. Any change to the catalogue or the scrubber is a privacy change: review it as one.
