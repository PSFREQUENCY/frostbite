import {
  callSafely,
  closeWithin,
  defaultShutdownTimeoutMs,
  type OnProblem,
} from "../guard.ts";
import { serviceSettingsSchema, type ServiceSettings } from "../settings.ts";
import { describeError, type DescribeOptions } from "./describe.ts";
import { errorProviderNames } from "./names.ts";
import type { ErrorProviderFactory, ErrorReporter } from "./port.ts";

export { describeError, maxStackFrames } from "./describe.ts";
export type { DescribeOptions } from "./describe.ts";
export { errorProviderNames } from "./names.ts";
export type { ErrorProviderName } from "./names.ts";
export type {
  ErrorContext,
  ErrorProvider,
  ErrorProviderFactory,
  ErrorReport,
  ErrorReporter,
} from "./port.ts";

// The settings of the error-reporting service, checked against the names it knows. This file holds no vendor: the registries that map a name
// to an adapter are `browser.ts` and `server.ts`, so a page never loads the server's library and the server never loads the browser's.
export const errorReportingSettingsSchema = serviceSettingsSchema(
  Object.fromEntries(errorProviderNames.map((name) => [name, true])),
);

export interface ErrorReporterOptions {
  // How a thrown value is described (the server leaves the message out).
  readonly describe?: DescribeOptions;
  readonly onProblem?: OnProblem;
  // The providers to choose from, by name.
  readonly registry: Readonly<Record<string, ErrorProviderFactory>>;
  readonly shutdownTimeoutMs?: number;
}

// The error reporter the platform calls, backed by the provider the settings name. Every error is described and scrubbed before the provider
// sees it, and nothing a provider does reaches the caller.
export function createErrorReporter(
  settings: ServiceSettings,
  options: ErrorReporterOptions,
): ErrorReporter {
  const onProblem = options.onProblem ?? (() => undefined);
  const factory = Object.hasOwn(options.registry, settings.provider)
    ? options.registry[settings.provider]
    : undefined;
  if (factory === undefined)
    throw new Error(`Unknown error-reporting provider "${settings.provider}".`);
  const provider = factory(settings);
  return {
    captureException(error, context) {
      callSafely(
        () =>
          provider.captureException(
            describeError(error, context, options.describe),
          ),
        onProblem,
      );
    },
    shutdown: () =>
      closeWithin(
        () => provider.shutdown(),
        options.shutdownTimeoutMs ?? defaultShutdownTimeoutMs,
        onProblem,
      ),
  };
}
