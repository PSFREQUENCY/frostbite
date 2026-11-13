import type { ServiceSettings } from "@frostbite/telemetry/settings";
import type { ErrorReporter } from "@frostbite/telemetry/errors";
import {
  createBrowserErrorReporter,
  installGlobalErrorHandlers,
} from "@frostbite/telemetry/errors/browser";
import { parseTelemetryEnvironment } from "@repo/config/telemetry";

const noop: ServiceSettings = {
  ingestOrigin: null,
  provider: "noop",
  token: null,
};

// The settings the page was built with. Each is read by its whole name so the build can put its value in; reading them by a name worked out
// at run time would find nothing in a browser. A setting that cannot work leaves the page without reports, never without the page: the
// server checks the same settings when it starts and refuses to run with a mistake in them.
function settings(): ServiceSettings {
  try {
    return parseTelemetryEnvironment({
      NEXT_PUBLIC_ERROR_REPORTING_ALLOW_AUTOMATION:
        process.env.NEXT_PUBLIC_ERROR_REPORTING_ALLOW_AUTOMATION,
      NEXT_PUBLIC_ERROR_REPORTING_PROVIDER:
        process.env.NEXT_PUBLIC_ERROR_REPORTING_PROVIDER,
      NEXT_PUBLIC_ERROR_REPORTING_TOKEN:
        process.env.NEXT_PUBLIC_ERROR_REPORTING_TOKEN,
    }).errorReporting;
  } catch {
    return noop;
  }
}

let reporter: ErrorReporter | null = null;

// The error reporter of this page: the provider the build names, made once.
export function browserErrorReporter(): ErrorReporter {
  reporter ??= createBrowserErrorReporter(settings());
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
