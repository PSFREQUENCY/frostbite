import {
  callSafely,
  closeWithin,
  defaultShutdownTimeoutMs,
  type OnProblem,
} from "../guard.ts";
import { scrubProperties } from "../scrubber.ts";
import { serviceSettingsSchema, type ServiceSettings } from "../settings.ts";
import { checkEvent } from "./catalogue.ts";
import type { Analytics, AnalyticsProviderFactory } from "./port.ts";
import { analyticsProviderNames } from "./names.ts";

export { analyticsEvents } from "./catalogue.ts";
export type { AnalyticsEventName, AnalyticsProperties } from "./catalogue.ts";
export type { Analytics, AnalyticsProvider } from "./port.ts";
export { analyticsProviderNames } from "./names.ts";
export type { AnalyticsProviderName } from "./names.ts";

// The settings of the analytics service, checked against the names it knows. This file holds no vendor: the registry that maps a name to an
// adapter is `browser.ts`, so nothing that only checks settings loads a vendor's library.
export const analyticsSettingsSchema = serviceSettingsSchema(
  Object.fromEntries(analyticsProviderNames.map((name) => [name, true])),
);

export interface AnalyticsOptions {
  readonly onProblem?: OnProblem;
  // The providers to choose from, by name.
  readonly registry: Readonly<Record<string, AnalyticsProviderFactory>>;
  readonly shutdownTimeoutMs?: number;
}

// The analytics the platform calls, backed by the provider the settings name. Every event is checked against the catalogue and scrubbed
// before the provider sees it, and nothing a provider does reaches the caller.
export function createAnalytics(
  settings: ServiceSettings,
  options: AnalyticsOptions,
): Analytics {
  const registry = options.registry;
  const onProblem = options.onProblem ?? (() => undefined);
  const factory = Object.hasOwn(registry, settings.provider)
    ? registry[settings.provider]
    : undefined;
  if (factory === undefined)
    throw new Error(`Unknown analytics provider "${settings.provider}".`);
  const provider = factory(settings);
  return {
    capture(name, properties) {
      const checked = checkEvent(name, properties);
      if (checked === null) {
        onProblem("invalid-event");
        return;
      }
      const scrubbed = scrubProperties(checked);
      callSafely(() => provider.capture(name, scrubbed), onProblem);
    },
    shutdown: () =>
      closeWithin(
        () => provider.shutdown(),
        options.shutdownTimeoutMs ?? defaultShutdownTimeoutMs,
        onProblem,
      ),
  };
}
