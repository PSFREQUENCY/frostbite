import type { Primitive } from "../scrubber.ts";
import type { ServiceSettings } from "../settings.ts";
import type { AnalyticsEventName, AnalyticsProperties } from "./catalogue.ts";

// What a provider does: take an event that has already been checked against the catalogue and scrubbed, and send it. It owns nothing else:
// not the list of events, not what may be sent, not what happens when it fails.
export interface AnalyticsProvider {
  capture(
    name: string,
    properties: Readonly<Record<string, Primitive>>,
  ): void | Promise<void>;
  shutdown(): Promise<void>;
}

export type AnalyticsProviderFactory = (
  settings: ServiceSettings,
) => AnalyticsProvider;

// What the rest of the platform calls. Never throws, never waits, and never names a provider.
export interface Analytics {
  capture<Name extends AnalyticsEventName>(
    name: Name,
    properties: AnalyticsProperties<Name>,
  ): void;
  shutdown(): Promise<void>;
}
