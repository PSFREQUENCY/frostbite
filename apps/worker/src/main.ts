import { createServer } from "node:http";

import { createNodeRequestListener } from "@frostbite/http/node-adapter";
import {
  createServerErrorReporter,
  installProcessErrorMonitor,
} from "@frostbite/telemetry/errors/server";
import { parseTelemetryEnvironment } from "@repo/config/telemetry";

import { expiredRowPolicy } from "@repo/configs/expired-rows";
import { providerRegistry } from "@repo/configs/providers";
import { parseWorkerPort } from "./config.ts";
import { createWorkerRuntime } from "./runtime.ts";
import { rowSweepLimitsOf } from "./sweep-limits.ts";

// The process entry shell: it only wires signals, a listener, and the runtime. It is excluded from
// in-process coverage; the behavior it starts is covered by the unit and integration suites, and a
// smoke test starts it as a real process.
function log(
  level: "error" | "info",
  message: string,
  fields: object = {},
): void {
  // Structured, secret-free lines; errors carry a message only, never a stack or request content.
  console.error(JSON.stringify({ level, message, ...fields }));
}

// Errors are reported to the provider the settings name (nothing, when none is set), as well as logged. A setting that cannot work stops the
// worker here, with its name. A server report carries no message: it can hold the player's own data.
const errors = createServerErrorReporter(
  parseTelemetryEnvironment(process.env).errorReporting,
  {
    onProblem: (problem) =>
      log("error", "error reporting problem", { problem }),
  },
);
installProcessErrorMonitor(errors, process);
function failed(message: string, error: Error): void {
  log("error", message, { error: error.message });
  errors.captureException(error);
}

const runtime = createWorkerRuntime({
  environment: process.env,
  providers: providerRegistry,
  rowSweepLimits: rowSweepLimitsOf(expiredRowPolicy),
});
const shutdown = new AbortController();
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.once(signal, () => shutdown.abort());

const port = parseWorkerPort(process.env);
const server = createServer(
  createNodeRequestListener(runtime.handle, {
    onError: (error) => failed("request failed", error),
  }),
);
await new Promise<void>((resolve) => server.listen(port, resolve));
log("info", "worker listening", { port });

await Promise.all([
  runtime.runRelay(shutdown.signal, (error) =>
    failed("relay pass failed", error),
  ),
  runtime.runRowSweeps(shutdown.signal, {
    onError: (error) => failed("row sweep failed", error),
    onResult: (counts) => log("info", "expired rows removed", { ...counts }),
  }),
  runtime.runCleanup(shutdown.signal, {
    onError: (error) => failed("cleanup pass failed", error),
    onResult: ({ claimed, failures, removed }) =>
      log(failures.length > 0 ? "error" : "info", "abandoned uploads", {
        claimed,
        failures,
        removed,
      }),
  }),
]);
// Stop accepting connections and drop idle keep-alive ones so shutdown cannot wait on them; a request
// still in flight (a media step) is allowed to finish.
const closed = new Promise<void>((resolve) => server.close(() => resolve()));
server.closeIdleConnections();
await closed;
await runtime.close();
await errors.shutdown();
log("info", "worker stopped");
