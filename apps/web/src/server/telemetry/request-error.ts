import { serverErrorReporter } from "./reporter.ts";

// What Next.js says of the request that failed, and of the page or route it was for. Only the template of the route is used, never the
// address asked for: that can hold a person's own ids.
export interface RequestErrorContext {
  readonly routePath: string;
}

// Told by Next.js of every error in a page, a route or an action that the platform did not catch itself. It must never throw.
export function reportRequestError(
  error: unknown,
  context: RequestErrorContext,
): void {
  try {
    serverErrorReporter().captureException(error, { route: context.routePath });
  } catch {
    // A report is never worth a failed request.
  }
}
