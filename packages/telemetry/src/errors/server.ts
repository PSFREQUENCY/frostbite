import type { ServiceSettings } from "../settings.ts";
import { createErrorReporter, type ErrorReporterOptions } from "./index.ts";
import type { ErrorReporter } from "./port.ts";
import { serverErrorProviders } from "./providers/server.ts";

// The error reporter for the server and the worker: the provider the setting names, from the providers that run there. A server error's
// message can carry a database query and the player's own values in it, so a report from here has none: the class, a database code and the
// lines of the stack say where and what.
export function createServerErrorReporter(
  settings: ServiceSettings,
  options: Partial<ErrorReporterOptions> = {},
): ErrorReporter {
  return createErrorReporter(settings, {
    describe: { message: "omit" },
    registry: serverErrorProviders,
    ...options,
  });
}

// What a process can be told of its own end.
export interface ProcessSource {
  on(
    event: "uncaughtExceptionMonitor",
    listener: (error: unknown) => void,
  ): unknown;
}

// Reports an error that is about to end the process, through the reporter. It only watches: the process still ends as it would (Node's own
// monitor event does not change that), so the report goes out as far as the closing allows.
export function installProcessErrorMonitor(
  reporter: ErrorReporter,
  source: ProcessSource,
): void {
  source.on("uncaughtExceptionMonitor", (error) => {
    reporter.captureException(error);
    void reporter.shutdown();
  });
}
