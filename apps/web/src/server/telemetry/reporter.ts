import { parseTelemetryEnvironment } from "@repo/config/telemetry";
import type { ErrorReporter } from "@frostbite/telemetry/errors";
import { createServerErrorReporter } from "@frostbite/telemetry/errors/server";

let reporter: ErrorReporter | null = null;

// The error reporter of this server: the provider the settings name, made once. What a provider does that goes wrong is a line in the log
// (secret-free, with no detail), because a report that cannot be sent is never worth failing a request for.
export function serverErrorReporter(): ErrorReporter {
  reporter ??= createServerErrorReporter(
    parseTelemetryEnvironment(process.env).errorReporting,
    {
      onProblem: (problem) =>
        console.error(JSON.stringify({ event: "telemetry.problem", problem })),
    },
  );
  return reporter;
}
