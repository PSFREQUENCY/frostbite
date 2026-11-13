import type { ErrorProviderFactory } from "../port.ts";
import { createNoopErrorReporter } from "./noop.ts";

// Every error-reporting provider there is, by the name the setting uses. A provider is added by writing its file and adding its line here.
export const errorProviders = {
  noop: createNoopErrorReporter,
} as const satisfies Readonly<Record<string, ErrorProviderFactory>>;
