import type { ErrorProviderName } from "../names.ts";
import type { ErrorProviderFactory } from "../port.ts";
import { createNoopErrorReporter } from "./noop.ts";
import { createPosthogBrowserErrors } from "./posthog-browser.ts";

// Every error-reporting provider that runs in a page, by the name the setting uses.
export const browserErrorProviders = {
  noop: createNoopErrorReporter,
  posthog: (settings) => createPosthogBrowserErrors(settings),
} as const satisfies Readonly<Record<ErrorProviderName, ErrorProviderFactory>>;
