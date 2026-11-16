import type { ErrorReporter } from "@frostbite/telemetry/errors";
import {
  createBrowserErrorReporter,
  installGlobalErrorHandlers,
} from "@frostbite/telemetry/errors/browser";

import { pageTelemetrySettings } from "./browser-settings";

let reporter: ErrorReporter | null = null;

// The error reporter of this page: the provider the build names, made once.
export function browserErrorReporter(): ErrorReporter {
  reporter ??= createBrowserErrorReporter(
    pageTelemetrySettings("errorReporting"),
  );
  return reporter;
}

// Starts reporting what the page throws and does not catch.
export function startBrowserErrorReporting(): void {
  installGlobalErrorHandlers(
    browserErrorReporter(),
    window,
    () => window.location.pathname,
  );
}
