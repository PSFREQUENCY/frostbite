import type { ServiceSettings } from "@frostbite/telemetry/settings";
import { parseTelemetryEnvironment } from "@repo/config/telemetry";

const noop: ServiceSettings = {
  ingestOrigin: null,
  provider: "noop",
  token: null,
};

// The settings the page was built with, for the service asked for. Each key is read by its whole name so the build can put its value in;
// reading them by a name worked out at run time would find nothing in a browser. A setting that cannot work leaves the page without that
// service, never without the page: the server checks the same settings when it starts and refuses to run with a mistake in them.
export function pageTelemetrySettings(
  service: "analytics" | "errorReporting",
): ServiceSettings {
  try {
    const settings = parseTelemetryEnvironment({
      NEXT_PUBLIC_ANALYTICS_ALLOW_AUTOMATION:
        process.env.NEXT_PUBLIC_ANALYTICS_ALLOW_AUTOMATION,
      NEXT_PUBLIC_ANALYTICS_PROVIDER:
        process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER,
      NEXT_PUBLIC_ANALYTICS_TOKEN: process.env.NEXT_PUBLIC_ANALYTICS_TOKEN,
      NEXT_PUBLIC_ERROR_REPORTING_ALLOW_AUTOMATION:
        process.env.NEXT_PUBLIC_ERROR_REPORTING_ALLOW_AUTOMATION,
      NEXT_PUBLIC_ERROR_REPORTING_PROVIDER:
        process.env.NEXT_PUBLIC_ERROR_REPORTING_PROVIDER,
      NEXT_PUBLIC_ERROR_REPORTING_TOKEN:
        process.env.NEXT_PUBLIC_ERROR_REPORTING_TOKEN,
    });
    return settings[service];
  } catch {
    return noop;
  }
}
