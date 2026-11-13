# Runbook: analytics

What this is: the platform counts how it is used (pages shown, games opened, runs, claims, sign-ins, wallets, shares) so the people running
it can see what works, without knowing who anyone is. The provider is chosen by settings, not code; PostHog (EU cloud, cookieless) is the
first. It is a service of its own, separate from error reporting (`runbook-error-reporting.md`): each has its own provider, key and address,
and either can be changed without the other. The design and the reasons are in `docs/posthog-plan.md` (outside the repository) and
`packages/telemetry/README.md`.

## What is sent, and what never is

Sent: a page was shown (its address as a template: `/s/:id`, never the query or the hash), and the events of one closed list
(`packages/telemetry/src/analytics/catalogue.ts`), each with only the plain properties that list allows:

| Event                                                    | Properties       | Where it is counted                                       |
| -------------------------------------------------------- | ---------------- | --------------------------------------------------------- |
| `game_opened`                                            | game             | a game's page opens                                       |
| `run_started`, `run_finished`                            | game, (verified) | the game asks for a run; the platform answered it         |
| `milestone_claim_started`, `_succeeded`, `_failed`       | game, (reason)   | a claim begins, is confirmed, or fails or is refused      |
| `leaderboard_viewed`                                     | game, window     | a board is opened, and each time another period is chosen |
| `share_clicked`                                          | platform         | where a person chose to share (`native`, `copy` too)      |
| `sign_in_started`, `sign_in_succeeded`, `sign_in_failed` | method, (reason) | the sign-in page, by the method and an outcome code       |
| `wallet_connect_started`, `_succeeded`, `_failed`        | wallet, (reason) | the wallet chooser, by the wallet's name                  |

A game is named by its public id. A reason is a code (an account outcome, a claim refusal, a kind of wallet failure), never words.

Never sent, and checked by tests: wallet addresses, emails, account or player ids, tokens, run records, seeds, scores, upload addresses,
query strings, the session cookie, the person's IP address, the page they came from, or anything typed. Anything not in the list is dropped
before the provider sees it, twice: by the platform's catalogue and again inside the library's own send hook.

Nobody is identified. There are no cookies and nothing in the browser's storage (so no banner), no autocapture, no recordings, no surveys and
no feature flags. Visitors are counted per day, not followed across days, and a visit's funnel (page, sign in, wallet, run, claim) works only
inside one visit. Every event is counted in the page, because only the page knows which visit it belongs to.

## Settings

| Setting                                  | Where         | Meaning                                                                                                                          |
| ---------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_ANALYTICS_PROVIDER`         | build and run | `noop` (or blank): count nothing. `posthog`: count to PostHog. Baked into the browser code, so changing it needs a rebuild.      |
| `NEXT_PUBLIC_ANALYTICS_TOKEN`            | build and run | The provider's public project key (it only lets a page send in). Required for any provider but noop.                             |
| `ANALYTICS_INGEST_ORIGIN`                | run           | Where the provider receives events (`https://eu.i.posthog.com` for the EU cloud). The platform forwards the page's events there. |
| `NEXT_PUBLIC_ANALYTICS_ALLOW_AUTOMATION` | build         | `true` only in test builds; refused when `APP_ENV` is preview or production.                                                     |

For a container build the first two are build arguments (`docker build --build-arg NEXT_PUBLIC_ANALYTICS_PROVIDER=posthog --build-arg
NEXT_PUBLIC_ANALYTICS_TOKEN=phc_…`; `deploy/Dockerfile` declares them, with the error-reporting pair), and the container needs all three as
ordinary environment variables when it runs. A setting that cannot work stops the server at start, naming the setting. The browser never
stops for it; it just counts nothing. With no ingest address the platform answers the page's events with nothing.

## Setting up PostHog (once)

1. In the PostHog project (the EU cloud; the same as error reporting's or a separate one), switch on cookieless mode (without it the events
   are accepted and dropped) and set a billing limit.
2. Give the deployment its settings: the project key, `https://eu.i.posthog.com` as the ingest origin, with the provider `posthog`. Rebuild.
3. Build the funnels and dashboards in PostHog (they live there, not in code): page, sign-in started, sign-in succeeded, wallet connected,
   run finished, claim succeeded. They work inside one visit.
4. Look at a real event: open a game on the deployed site and check `game_opened` arrives (see below).

## Checking it works

Open the deployed site with the browser's network tab and look for requests to `/telemetry/events/…` (to the platform's own address, never to
another). In PostHog's live events, a page view and, on a game page, `game_opened` arrive within about a minute (the library loads once the
page is idle and sends in batches).

## When nothing arrives

- The provider is `noop`, or the browser build predates the setting (it is baked in: rebuild).
- Cookieless mode is not switched on in the PostHog project: events are accepted and dropped.
- The visitor sends Do Not Track, or is a robot: both are left out on purpose.
- `ANALYTICS_INGEST_ORIGIN` is not set: the platform answers the page's events with nothing.
- A tab closed at once, before the page was idle, never loaded the library.

## Changing provider

Change `NEXT_PUBLIC_ANALYTICS_PROVIDER`, the key and the ingest origin, then rebuild. Not interchangeable: dashboards and funnels live in the
provider and are made again there; a new provider needs one adapter in `packages/telemetry/src/analytics/providers/` and one line in its
registry (`browser.ts`), and must pass the shared contract test.
