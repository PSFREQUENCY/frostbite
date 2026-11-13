import { startBrowserErrorReporting } from "./telemetry/browser-reporter";

// Next.js runs this in the browser before the page's own code. With no provider set, it does nothing.
startBrowserErrorReporting();
