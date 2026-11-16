import type { Analytics } from "@frostbite/telemetry/analytics";
import { createContext, useContext, type ReactNode } from "react";

// What a page counts with when nothing has been provided: nothing. A component that counts something works in a test, in a story and on a
// page with no analytics, without a provider above it.
const doNothing: Analytics = {
  capture: () => undefined,
  shutdown: () => Promise.resolve(),
};

const AnalyticsContext = createContext<Analytics>(doNothing);

// Gives the components below it the analytics of the page. The app makes it once, at its root, from its own settings; a feature only asks
// for it, and never names a provider.
export function AnalyticsProvider({
  analytics,
  children,
}: {
  readonly analytics: Analytics;
  readonly children: ReactNode;
}) {
  return <AnalyticsContext value={analytics}>{children}</AnalyticsContext>;
}

// The analytics of the page the component is on. Calling `capture` never throws and never waits, and only the events in the platform's
// catalogue are accepted, so a call is safe anywhere, including in an event handler.
export function useAnalytics(): Analytics {
  return useContext(AnalyticsContext);
}
