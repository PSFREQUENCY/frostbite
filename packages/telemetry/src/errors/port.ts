import type { ServiceSettings } from "../settings.ts";

// Where an error happened, in the platform's own words: ids it made itself, never anything about a person.
export interface ErrorContext {
  // Finds the same error in the server log.
  readonly correlationId?: string;
  readonly operationId?: string;
  // The version that was running.
  readonly release?: string;
  // The page or route, as a template.
  readonly route?: string;
}

// An error as a provider receives it: already described, checked and scrubbed.
export interface ErrorReport {
  // A database error's code (`23505`), when it has one.
  readonly code?: string;
  readonly context: ErrorContext;
  readonly frames: readonly string[];
  readonly message: string;
  readonly name: string;
}

export interface ErrorProvider {
  captureException(report: ErrorReport): void | Promise<void>;
  shutdown(): Promise<void>;
}

export type ErrorProviderFactory = (settings: ServiceSettings) => ErrorProvider;

// What the rest of the platform calls. Never throws, never waits, and never names a provider.
export interface ErrorReporter {
  captureException(error: unknown, context?: ErrorContext): void;
  shutdown(): Promise<void>;
}
