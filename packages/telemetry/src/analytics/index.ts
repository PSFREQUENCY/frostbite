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
import { analyticsProviders } from "./providers/index.ts";

export { analyticsEvents } from "./catalogue.ts";
export type { AnalyticsEventName, AnalyticsProperties } from "./catalogue.ts";
export type { Analytics, AnalyticsProvider } from "./port.ts";
export { analyticsProviders } from "./providers/index.ts";

export const analyticsSettingsSchema =
  serviceSettingsSchema(analyticsProviders);

export interface AnalyticsOptions {
  readonly onProblem?: OnProblem;
  // The providers to choose from; the platform's own unless a test brings others.
  readonly registry?: Readonly<Record<string, AnalyticsProviderFactory>>;
  readonly shutdownTimeoutMs?: number;
}

// The analytics the platform calls, backed by the provider the settings name. Every event is checked against the catalogue and scrubbed
// before the provider sees it, and nothing a provider does reaches the caller.
export function createAnalytics(
  settings: ServiceSettings,
  options: AnalyticsOptions = {},
): Analytics {
  const registry: Readonly<Record<string, AnalyticsProviderFactory>> =
    options.registry ?? analyticsProviders;
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
