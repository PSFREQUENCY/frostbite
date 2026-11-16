import type { PostHog, PostHogOptions } from "posthog-node";
import { PostHog as PostHogClient } from "posthog-node";

import type { ServiceSettings } from "../../settings.ts";
import type { ErrorProvider } from "../port.ts";
import { errorOf, propertiesOf } from "./posthog-report.ts";
import { scrubPostHogRecord } from "../../providers-shared/posthog-scrub.ts";

// Every server report is from one anonymous source: nobody is identified, and no person is made of it.
export const serverDistinctId = "platform-server";
// How long closing may wait for the last reports to go.
const closeTimeoutMs = 2_000;
const requestTimeoutMs = 3_000;

type Client = Pick<PostHog, "captureException" | "shutdown">;

export interface PosthogServerDeps {
  readonly create: (token: string, options: PostHogOptions) => Client;
}

// The client's settings: reports go at once, the provider sees no location, and the library's own wish to catch uncaught errors by itself is
// off (the platform reports what it chooses). `before_send` takes out what the Node library adds on its own: the lines of our own source code
// around each frame, which it reads from disk and has no setting to stop.
export function posthogServerOptions(host: string): PostHogOptions {
  return {
    before_send: (event) => ({
      ...event,
      properties: scrubPostHogRecord(event.properties ?? {}, {
        dropSourceContext: true,
      }),
    }),
    disableGeoip: true,
    enableExceptionAutocapture: false,
    flushAt: 1,
    flushInterval: 5_000,
    host,
    requestTimeout: requestTimeoutMs,
  };
}

// Reports to PostHog from the server and the worker. The ingest address is required here (the server talks to the provider directly, not
// through the page's proxy), so a missing one stops the process that creates this, at start, with the setting's name.
export function createPosthogServerErrors(
  settings: ServiceSettings,
  deps: PosthogServerDeps = {
    create: (token, options) => new PostHogClient(token, options),
  },
): ErrorProvider {
  if (settings.ingestOrigin === null)
    throw new Error(
      "The error-reporting provider posthog needs ERROR_REPORTING_INGEST_ORIGIN (the address it receives reports at).",
    );
  const client = deps.create(
    settings.token ?? "",
    posthogServerOptions(settings.ingestOrigin),
  );
  return {
    captureException(report) {
      client.captureException(errorOf(report), serverDistinctId, {
        ...propertiesOf(report),
        $process_person_profile: false,
      });
    },
    shutdown: () => client.shutdown(closeTimeoutMs),
  };
}
