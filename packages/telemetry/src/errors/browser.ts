import type { ServiceSettings } from "../settings.ts";
import { createErrorReporter, type ErrorReporterOptions } from "./index.ts";
import type { ErrorReporter } from "./port.ts";
import { browserErrorProviders } from "./providers/browser.ts";

export { errorIngestPath } from "./providers/posthog-browser.ts";

// The error reporter for a page: the provider the setting names, from the providers that run in a browser.
export function createBrowserErrorReporter(
  settings: ServiceSettings,
  options: Partial<ErrorReporterOptions> = {},
): ErrorReporter {
  return createErrorReporter(settings, {
    registry: browserErrorProviders,
    ...options,
  });
}

// The two things a page can say it did not handle, as a window tells them. Only what these tests need is asked of a window.
export interface ErrorSource {
  addEventListener(
    type: "error",
    listener: (event: { readonly error?: unknown }) => void,
  ): void;
  addEventListener(
    type: "unhandledrejection",
    listener: (event: { readonly reason?: unknown }) => void,
  ): void;
  removeEventListener(
    type: "error",
    listener: (event: { readonly error?: unknown }) => void,
  ): void;
  removeEventListener(
    type: "unhandledrejection",
    listener: (event: { readonly reason?: unknown }) => void,
  ): void;
}

// Reports what a page throws and does not catch, and a promise it rejects and nobody handles, through the reporter (so through the scrubber
// and whichever provider is set). Returns how to take the handlers away. The browser's own behaviour (the message in the console) is not
// touched. `route` says which page; it is asked at the moment of the error, and the reporter makes it a template.
export function installGlobalErrorHandlers(
  reporter: ErrorReporter,
  source: ErrorSource,
  route: () => string,
): () => void {
  const onError = (event: { readonly error?: unknown }) => {
    reporter.captureException(event.error, { route: route() });
  };
  const onRejection = (event: { readonly reason?: unknown }) => {
    reporter.captureException(event.reason, { route: route() });
  };
  source.addEventListener("error", onError);
  source.addEventListener("unhandledrejection", onRejection);
  return () => {
    source.removeEventListener("error", onError);
    source.removeEventListener("unhandledrejection", onRejection);
  };
}
