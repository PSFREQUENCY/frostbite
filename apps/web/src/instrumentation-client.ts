import { startBrowserAnalytics } from "./telemetry/browser-analytics";
import { startBrowserErrorReporting } from "./telemetry/browser-reporter";

// Next.js runs this in the browser before the page's own code. With no provider set, each does nothing.
startBrowserErrorReporting();
startBrowserAnalytics();
