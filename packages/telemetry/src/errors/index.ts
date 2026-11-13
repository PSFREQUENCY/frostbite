import {
  callSafely,
  closeWithin,
  defaultShutdownTimeoutMs,
  type OnProblem,
} from "../guard.ts";
import { serviceSettingsSchema, type ServiceSettings } from "../settings.ts";
import { describeError } from "./describe.ts";
import type { ErrorProviderFactory, ErrorReporter } from "./port.ts";
import { errorProviders } from "./providers/index.ts";

export { describeError, maxStackFrames } from "./describe.ts";
export type {
  ErrorContext,
  ErrorProvider,
  ErrorReport,
  ErrorReporter,
} from "./port.ts";
export { errorProviders } from "./providers/index.ts";

export const errorReportingSettingsSchema =
  serviceSettingsSchema(errorProviders);

export interface ErrorReporterOptions {
  readonly onProblem?: OnProblem;
  // The providers to choose from; the platform's own unless a test brings others.
  readonly registry?: Readonly<Record<string, ErrorProviderFactory>>;
  readonly shutdownTimeoutMs?: number;
}

// The error reporter the platform calls, backed by the provider the settings name. Every error is described and scrubbed before the
// provider sees it, and nothing a provider does reaches the caller.
export function createErrorReporter(
  settings: ServiceSettings,
  options: ErrorReporterOptions = {},
): ErrorReporter {
  const registry: Readonly<Record<string, ErrorProviderFactory>> =
    options.registry ?? errorProviders;
  const onProblem = options.onProblem ?? (() => undefined);
  const factory = Object.hasOwn(registry, settings.provider)
    ? registry[settings.provider]
    : undefined;
  if (factory === undefined)
    throw new Error(`Unknown error-reporting provider "${settings.provider}".`);
  const provider = factory(settings);
  return {
    captureException(error, context) {
      callSafely(
        () => provider.captureException(describeError(error, context)),
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
