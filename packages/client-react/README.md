# `@frostbite/client-react`

The React hooks every browser feature needs, extracted so none reimplements them: loading a value,
acting on the server, and counting what a person does.

## Public API

- `useResource(load, key, describe)` loads on mount and whenever `key` changes, and again on `reload`.
  A newer load supersedes an older one (the older is aborted), an unmounted page never receives a late
  response, a failed reload keeps the last good value, and `replace` puts in a value the page already
  holds (such as a save's response).
- `useAction(describe)` runs one mutation at a time with a `busy` flag and the last failure as `notice`.

- `AnalyticsProvider` gives the components below it the page's analytics (the app makes it once, at its root, from its own settings), and
  `useAnalytics()` returns it: `capture(name, properties)` takes only the events of `@frostbite/telemetry`'s catalogue, never throws and
  never waits. With no provider above it, it counts nothing, so a component that counts works in a test or on a page with no analytics.

`useResource` and `useAction` take a `describe` function that turns whatever was thrown into the feature's own failure words, so
the copy stays with the feature and the behaviour is shared.

## Dependencies and configuration

React, and the types of `@frostbite/telemetry` (no vendor). No environment configuration.

## Verification

Run `typecheck`, `test:unit`, `test:integration`, or `test:coverage`. Platform engineering owns this
package.

## Ownership

Platform front end.
