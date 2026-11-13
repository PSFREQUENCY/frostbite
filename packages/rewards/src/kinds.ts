import type { JsonValue } from "@frostbite/shared/chain";
import type { z } from "zod";

import { isAssetKey } from "./asset.ts";
import type { EntryDraft } from "./types.ts";

// A KIND is how one sort of event earns something: referral cuts, leaderboard prizes, a creator's share. It names the event it reads, the
// shape of its own settings, and a function from a checked event to the earnings it makes. A program is a kind with settings; adding a kind
// is writing one of these and listing it in the registry the platform builds, and nothing else in the ledger or the payouts changes.
export interface RewardKind<Params, Payload> {
  readonly accrue: (input: {
    readonly eventId: string;
    readonly occurredAt: Date;
    readonly params: Params;
    readonly payload: Payload;
  }) => readonly EntryDraft[];
  readonly eventType: string;
  readonly id: string;
  readonly paramsSchema: z.ZodType<Params>;
  readonly payloadSchema: z.ZodType<Payload>;
}

export type ParamsCheck =
  | { readonly issues: readonly string[]; readonly ok: false }
  | { readonly ok: true; readonly params: JsonValue };

export type AccrualOutcome =
  | { readonly drafts: readonly EntryDraft[]; readonly ok: true }
  | { readonly ok: false; readonly reason: "bad-params" | "bad-payload" };

// A kind with its types folded away, so kinds of different shapes live in one list. What it hands back is checked on the way out.
export interface RegisteredKind {
  readonly accrue: (input: {
    readonly eventId: string;
    readonly occurredAt: Date;
    readonly params: JsonValue;
    readonly payload: JsonValue;
  }) => AccrualOutcome;
  readonly checkParams: (params: JsonValue) => ParamsCheck;
  readonly eventType: string;
  readonly id: string;
}

// A kind that asks for something no ledger entry may be (a zero or negative amount, an unknown asset, no source) is a bug in the kind. It is
// loud, and the whole event is rolled back, rather than a partial set of earnings being kept.
export class RewardKindError extends Error {
  readonly kind: string;

  constructor(kind: string, message: string) {
    super(`The reward kind "${kind}" ${message}`);
    this.kind = kind;
    this.name = "RewardKindError";
  }
}

const sourceKeyLimit = 200;

function checkedDrafts(
  kind: string,
  drafts: readonly EntryDraft[],
): readonly EntryDraft[] {
  const seen = new Set<string>();
  for (const draft of drafts) {
    if (draft.amount <= 0n)
      throw new RewardKindError(
        kind,
        "asked for an amount that is not above zero.",
      );
    if (!isAssetKey(draft.assetKey))
      throw new RewardKindError(
        kind,
        "named an asset that is not an asset key.",
      );
    if (draft.sourceKey === "" || draft.sourceKey.length > sourceKeyLimit)
      throw new RewardKindError(kind, "gave an earning no usable source key.");
    if (seen.has(draft.sourceKey))
      throw new RewardKindError(
        kind,
        "gave two earnings of one event the same source key.",
      );
    seen.add(draft.sourceKey);
  }
  return drafts;
}

export function defineRewardKind<Params, Payload>(
  kind: RewardKind<Params, Payload>,
): RegisteredKind {
  return {
    accrue: ({ eventId, occurredAt, params, payload }) => {
      const parsedParams = kind.paramsSchema.safeParse(params);
      if (!parsedParams.success) return { ok: false, reason: "bad-params" };
      const parsedPayload = kind.payloadSchema.safeParse(payload);
      if (!parsedPayload.success) return { ok: false, reason: "bad-payload" };
      return {
        drafts: checkedDrafts(
          kind.id,
          kind.accrue({
            eventId,
            occurredAt,
            params: parsedParams.data,
            payload: parsedPayload.data,
          }),
        ),
        ok: true,
      };
    },
    checkParams: (params) => {
      const parsed = kind.paramsSchema.safeParse(params);
      return parsed.success
        ? { ok: true, params }
        : {
            issues: parsed.error.issues.map(
              ({ message, path }) =>
                `${path.join(".") || "params"}: ${message}`,
            ),
            ok: false,
          };
    },
    eventType: kind.eventType,
    id: kind.id,
  };
}

// Every kind the platform has, by id. Explicit: built from a list in code, never found by looking in folders.
export interface KindRegistry {
  readonly forEvent: (eventType: string) => readonly RegisteredKind[];
  readonly get: (id: string) => RegisteredKind | undefined;
  readonly ids: () => readonly string[];
}

export function createKindRegistry(
  kinds: readonly RegisteredKind[],
): KindRegistry {
  const byId = new Map<string, RegisteredKind>();
  for (const kind of kinds) {
    if (byId.has(kind.id))
      throw new Error(`Two reward kinds are named "${kind.id}".`);
    byId.set(kind.id, kind);
  }
  return {
    forEvent: (eventType) =>
      kinds.filter((kind) => kind.eventType === eventType),
    get: (id) => byId.get(id),
    ids: () => [...byId.keys()],
  };
}
