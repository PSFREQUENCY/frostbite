// The names an error-reporting setting may take. A provider is added by its adapter file(s), its line in the registry of each runtime that
// has it (`browser.ts`, `server.ts`), and its name here; a test holds the registries and this list to each other.
export const errorProviderNames = ["noop", "posthog"] as const;
export type ErrorProviderName = (typeof errorProviderNames)[number];
