import type { ErrorProviderName } from "../names.ts";
import type { ErrorProviderFactory } from "../port.ts";
import { createNoopErrorReporter } from "./noop.ts";
import { createPosthogServerErrors } from "./posthog-server.ts";

// Every error-reporting provider that runs on the server and in the worker, by the name the setting uses.
export const serverErrorProviders = {
  noop: createNoopErrorReporter,
  posthog: (settings) => createPosthogServerErrors(settings),
} as const satisfies Readonly<Record<ErrorProviderName, ErrorProviderFactory>>;
