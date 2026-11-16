import type { EnvironmentDefinition } from "./definitions.ts";

// The settings of the two reports the platform makes of itself, analytics and error reporting, kept apart from the other definitions to keep
// each file small. Each has its own provider, so either can be changed without the other. The provider and the project key are public
// because the browser needs them too (a project key only lets a page send events in; it reads nothing). `parseTelemetryEnvironment` reads them.
export const telemetryEnvironmentDefinitions = [
  {
    key: "NEXT_PUBLIC_ANALYTICS_PROVIDER",
    description:
      "Which provider receives product analytics (page views and the platform's events): noop (none; the default when blank) or a provider the platform has an adapter for. Baked into the browser build, so changing it needs a rebuild.",
    exposure: "public",
    required: false,
    secret: false,
  },
  {
    key: "NEXT_PUBLIC_ANALYTICS_TOKEN",
    description:
      "The analytics provider's public project key. Required when the analytics provider is not noop.",
    exposure: "public",
    required: false,
    secret: false,
  },
  {
    key: "ANALYTICS_INGEST_ORIGIN",
    description:
      "The address the analytics provider receives events at (the platform's own /telemetry/events path forwards to it). Blank when the provider needs none.",
    exposure: "server",
    required: false,
    secret: false,
  },
  {
    key: "NEXT_PUBLIC_ANALYTICS_ALLOW_AUTOMATION",
    description:
      "true lets a browser that announces itself as a robot send analytics events, which the browsers that run our tests do; blank or false keeps them out. For test builds only: refused when APP_ENV is preview or production. Baked into the browser build.",
    exposure: "public",
    required: false,
    secret: false,
  },
  {
    key: "NEXT_PUBLIC_ERROR_REPORTING_PROVIDER",
    description:
      "Which provider receives error reports from the server, the worker and the browser: noop (none; the default when blank) or a provider the platform has an adapter for. Baked into the browser build, so changing it needs a rebuild.",
    exposure: "public",
    required: false,
    secret: false,
  },
  {
    key: "NEXT_PUBLIC_ERROR_REPORTING_TOKEN",
    description:
      "The error-reporting provider's public project key. Required when the error-reporting provider is not noop.",
    exposure: "public",
    required: false,
    secret: false,
  },
  {
    key: "ERROR_REPORTING_INGEST_ORIGIN",
    description:
      "The address the error-reporting provider receives reports at. Blank when the provider needs none.",
    exposure: "server",
    required: false,
    secret: false,
  },
  {
    key: "NEXT_PUBLIC_ERROR_REPORTING_ALLOW_AUTOMATION",
    description:
      "true lets a browser that announces itself as a robot send error reports, which the browsers that run our tests do; blank or false keeps them out. For test builds only: refused when APP_ENV is preview or production. Baked into the browser build.",
    exposure: "public",
    required: false,
    secret: false,
  },
] as const satisfies readonly EnvironmentDefinition[];
