import { analyticsSettingsSchema } from "@frostbite/telemetry/analytics";
import { errorReportingSettingsSchema } from "@frostbite/telemetry/errors";
import {
  noopProvider,
  type ServiceSettings,
} from "@frostbite/telemetry/settings";
import type { z } from "zod";

const blankAsUnset = (value: string | undefined) =>
  value === undefined || value.trim() === "" ? undefined : value.trim();

// Where the settings are read from: the process environment on a server, an object of the page's own `NEXT_PUBLIC_` values in a browser.
export type EnvironmentSource = Readonly<Record<string, string | undefined>>;

export interface TelemetryEnvironment {
  readonly analytics: ServiceSettings;
  readonly errorReporting: ServiceSettings;
}

interface Keys {
  readonly allowAutomation?: string;
  readonly ingestOrigin: string;
  readonly provider: string;
  readonly token: string;
}

// One service's settings from its three keys: blank means noop. A provider the platform has no adapter for, or one that needs its project key
// and has none, stops boot with the key's name, rather than reporting nothing without anyone knowing.
function parseService(
  source: EnvironmentSource,
  keys: Keys,
  schema: z.ZodType<ServiceSettings>,
): ServiceSettings {
  const allowAutomation =
    keys.allowAutomation !== undefined &&
    blankAsUnset(source[keys.allowAutomation]) === "true";
  // Robots are kept out of reports and counts so that a crawler is not mistaken for a person. Letting them in is for the browsers that run our
  // tests, and wherever real people sign in it would only let a script flood the provider.
  if (
    allowAutomation &&
    (source.APP_ENV === "preview" || source.APP_ENV === "production")
  )
    throw new Error(
      `${keys.allowAutomation ?? ""}=true lets robots report; it is not allowed when APP_ENV is ${source.APP_ENV}.`,
    );
  const checked = schema.safeParse({
    ...(allowAutomation ? { allowAutomation } : {}),
    ingestOrigin: blankAsUnset(source[keys.ingestOrigin]) ?? null,
    provider: blankAsUnset(source[keys.provider]) ?? noopProvider,
    token: blankAsUnset(source[keys.token]) ?? null,
  });
  if (checked.success) return checked.data;
  const found = checked.error.issues.map((issue) => {
    const field = String(issue.path[0]);
    const key =
      field === "provider" || field === "token" || field === "ingestOrigin"
        ? keys[field]
        : keys.provider;
    return `${key}: ${issue.message}`;
  });
  throw new Error(found.join(" "));
}

// What the deployment is set up to report to. With nothing set, both are noop and the platform reports nothing anywhere.
export function parseTelemetryEnvironment(
  source: EnvironmentSource,
): TelemetryEnvironment {
  return {
    analytics: parseService(
      source,
      {
        allowAutomation: "NEXT_PUBLIC_ANALYTICS_ALLOW_AUTOMATION",
        ingestOrigin: "ANALYTICS_INGEST_ORIGIN",
        provider: "NEXT_PUBLIC_ANALYTICS_PROVIDER",
        token: "NEXT_PUBLIC_ANALYTICS_TOKEN",
      },
      analyticsSettingsSchema,
    ),
    errorReporting: parseService(
      source,
      {
        allowAutomation: "NEXT_PUBLIC_ERROR_REPORTING_ALLOW_AUTOMATION",
        ingestOrigin: "ERROR_REPORTING_INGEST_ORIGIN",
        provider: "NEXT_PUBLIC_ERROR_REPORTING_PROVIDER",
        token: "NEXT_PUBLIC_ERROR_REPORTING_TOKEN",
      },
      errorReportingSettingsSchema,
    ),
  };
}
