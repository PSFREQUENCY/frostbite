import { createBrowserAnalytics } from "@frostbite/telemetry/analytics/browser";
import type { Analytics } from "@frostbite/telemetry/analytics";

import { pageTelemetrySettings } from "./browser-settings";

let analytics: Analytics | null = null;

// The analytics of this page: the provider the build names, made once.
export function browserAnalytics(): Analytics {
  analytics ??= createBrowserAnalytics(pageTelemetrySettings("analytics"));
  return analytics;
}

// What the components below the root count with. It asks for the page's analytics only when something is counted, which is always in the
// browser (an event handler or an effect), so rendering on the server never starts anything.
export const pageAnalytics: Analytics = {
  capture: (name, properties) => {
    browserAnalytics().capture(name, properties);
  },
  shutdown: () => browserAnalytics().shutdown(),
};

// Starts counting pages. With no provider set, it does nothing.
export function startBrowserAnalytics(): void {
  browserAnalytics();
}
