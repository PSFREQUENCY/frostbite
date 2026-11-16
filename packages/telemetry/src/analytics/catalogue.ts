import { z } from "zod";

import type { Primitive } from "../scrubber.ts";

// Every event the platform may report, and the only properties each may carry. An event or a property not here is dropped before any provider
// sees it, so what leaves the platform is decided in this one list. Properties are short names the platform itself chose (a game's slug, a
// sign-in method, a reason code), never what a person typed and never an identifier of a person, a wallet or a run.
const name = z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/u);
const reason = z.string().regex(/^[a-z0-9][a-z0-9_.-]{0,63}$/u);
const game = z.strictObject({ game: name });
const gameFailure = z.strictObject({ game: name, reason });

export const analyticsEvents = {
  game_opened: game,
  leaderboard_viewed: z.strictObject({ game: name, window: name }),
  milestone_claim_failed: gameFailure,
  milestone_claim_started: game,
  milestone_claim_succeeded: game,
  run_finished: z.strictObject({ game: name, verified: z.boolean() }),
  run_started: game,
  share_clicked: z.strictObject({ platform: name }),
  sign_in_failed: z.strictObject({ method: name, reason }),
  sign_in_started: z.strictObject({ method: name }),
  sign_in_succeeded: z.strictObject({ method: name }),
  wallet_connect_failed: z.strictObject({ reason, wallet: name }),
  wallet_connect_started: z.strictObject({ wallet: name }),
  wallet_connect_succeeded: z.strictObject({ wallet: name }),
} as const;

export type AnalyticsEventName = keyof typeof analyticsEvents;
export type AnalyticsProperties<Name extends AnalyticsEventName> = z.infer<
  (typeof analyticsEvents)[Name]
>;

const schemas: Readonly<
  Record<string, z.ZodType<Readonly<Record<string, Primitive>>>>
> = analyticsEvents;

// The properties of an event as the catalogue allows them, or null when the event is not in the catalogue or its properties are not
// what it allows.
export function checkEvent(
  eventName: string,
  properties: unknown,
): Readonly<Record<string, Primitive>> | null {
  const schema = Object.hasOwn(schemas, eventName)
    ? schemas[eventName]
    : undefined;
  const checked = schema?.safeParse(properties);
  return checked?.success === true ? checked.data : null;
}
