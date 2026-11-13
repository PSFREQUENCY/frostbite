import { z } from "zod";

// The one provider every service starts as, and the one that needs nothing: it does nothing. A deployment with no setting is this.
export const noopProvider = "noop";

export interface ServiceSettings {
  // Whether a browser the provider's library takes for a robot may report. Only a test build sets it: the browsers that run our tests
  // announce themselves as robots, and without it they report nothing. It is refused where real people sign in (see `@repo/config`).
  readonly allowAutomation?: boolean;
  // Where the provider's ingest lives (the reverse proxy forwards to it); null when the provider needs none.
  readonly ingestOrigin: string | null;
  // The provider's name, one of the registry's keys.
  readonly provider: string;
  // The public project key the provider gives; null for noop.
  readonly token: string | null;
}

// The settings of one service (analytics, or error reporting) checked against its registry: a provider that is not in it, or one that
// needs a key and has none, stops boot with its reason instead of silently reporting nothing.
export function serviceSettingsSchema(
  registry: Readonly<Record<string, unknown>>,
) {
  return z
    .object({
      allowAutomation: z.boolean().optional(),
      ingestOrigin: z.url().nullable(),
      provider: z.string(),
      token: z.string().min(1).nullable(),
    })
    .superRefine((settings, context) => {
      if (!Object.hasOwn(registry, settings.provider))
        context.addIssue({
          code: "custom",
          message: `Unknown provider "${settings.provider}"; known: ${Object.keys(registry).join(", ")}.`,
          path: ["provider"],
        });
      else if (settings.provider !== noopProvider && settings.token === null)
        context.addIssue({
          code: "custom",
          message: `Provider "${settings.provider}" needs its project key.`,
          path: ["token"],
        });
    });
}
