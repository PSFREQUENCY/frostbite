import type { InternalErrorReport } from "@frostbite/http";

import { serverErrorReporter } from "../telemetry/reporter.ts";
import { logInternalError } from "./internal-error-log.ts";

// What to report for each kind of internal error: the exception itself, or, for an answer the operation's declaration did not allow, an error
// named for it (its class and, for an application code, that code say what happened; there is no message to carry anything else).
function errorOf(report: InternalErrorReport): unknown {
  if (report.kind === "exception") return report.error;
  return report.kind === "undeclared-error"
    ? Object.assign(new Error("undeclared error"), {
        code: report.code,
        name: "UndeclaredHttpError",
      })
    : Object.assign(new Error("invalid output"), {
        name: "InvalidOutputHttpError",
      });
}

// Told of every internal error by the HTTP layer: the log line (the record of truth, found by the correlation id) and a report to the error
// provider carrying the same ids, so an issue and a log line meet. The log is written first and nothing the report does can stop it.
export function reportInternalError(report: InternalErrorReport): void {
  logInternalError(report);
  try {
    serverErrorReporter().captureException(errorOf(report), {
      correlationId: report.correlationId,
      operationId: report.operationId,
    });
  } catch {
    // A report is never worth a failed request.
  }
}
