import type { ErrorReport } from "../port.ts";

// An Error the library can read, built from what a report kept: the library takes an Error and parses its stack, so the message and the
// frames it sees are the ones that were already scrubbed (or left out).
export function errorOf(report: ErrorReport): Error {
  const error = new Error(report.message);
  error.name = report.name;
  error.stack = [
    report.message === "" ? report.name : `${report.name}: ${report.message}`,
    ...report.frames.map((frame) => `    ${frame}`),
  ].join("\n");
  return error;
}

// The platform's own words about where it happened, as properties of the event. Absent ones are left out.
export function propertiesOf(
  report: ErrorReport,
): Readonly<Record<string, string>> {
  const { correlationId, operationId, release, route } = report.context;
  return {
    ...(report.code === undefined ? {} : { error_code: report.code }),
    ...(correlationId === undefined ? {} : { correlation_id: correlationId }),
    ...(operationId === undefined ? {} : { operation_id: operationId }),
    ...(release === undefined ? {} : { app_release: release }),
    ...(route === undefined ? {} : { route }),
  };
}
