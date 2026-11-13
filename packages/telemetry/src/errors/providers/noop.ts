import type { ErrorProvider } from "../port.ts";

// Reports nothing. It is what runs when no provider is set, in local runs and in tests.
export function createNoopErrorReporter(): ErrorProvider {
  return {
    captureException: () => undefined,
    shutdown: () => Promise.resolve(),
  };
}
