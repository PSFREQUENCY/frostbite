import type {
  DatabaseClient,
  DatabaseTransaction,
} from "@frostbite/database/connection";
import { rewardEntries } from "@frostbite/database/schema/rewards";
import { and, eq } from "drizzle-orm";

import type { KindRegistry } from "./kinds.ts";
import type { Programs } from "./programs.ts";
import type { RewardEvent } from "./types.ts";

export interface AccrualDependencies {
  readonly clock: () => Date;
  readonly database: DatabaseClient;
  readonly newId: () => string;
  readonly programs: Programs;
  readonly registry: KindRegistry;
}

export interface AccrueResult {
  // Earnings written now.
  readonly accrued: number;
  // Earnings the event asked for that were already there (the same event told again).
  readonly duplicates: number;
  // Programs that read this event but could not use it: its payload or the program's settings were not what the kind expects.
  readonly skipped: readonly {
    readonly programKey: string;
    readonly reason: "bad-params" | "bad-payload";
  }[];
}

export type ReverseResult =
  | { readonly entryId: string; readonly kind: "reversed" }
  | { readonly kind: "already-reversed" | "not-found" };

const eventIdLimit = 200;

// Turning events into earnings, and undoing them. An event is told to every enabled program whose kind reads its type; each earning lands
// once, whatever the number of times the event is told, because the program and the earning's source are unique.
export function createAccrual(dependencies: AccrualDependencies) {
  const { clock, database, newId, programs, registry } = dependencies;

  return {
    // Writes what the event earns, all together or not at all: a kind that asks for something no entry may be (see `RewardKindError`) stops
    // the event and keeps nothing of it. A program that is off earns nothing from it.
    async accrue(event: RewardEvent): Promise<AccrueResult> {
      if (event.id === "" || event.id.length > eventIdLimit)
        throw new TypeError(
          "A reward event needs an id of 1 to 200 characters.",
        );
      if (registry.forEvent(event.type).length === 0)
        return { accrued: 0, duplicates: 0, skipped: [] };
      const reading = (await programs.allInForce()).flatMap((setting) => {
        const kind = registry.get(setting.kind);
        return setting.enabled && kind?.eventType === event.type
          ? [{ kind, setting }]
          : [];
      });
      let accrued = 0;
      let duplicates = 0;
      const skipped: {
        programKey: string;
        reason: "bad-params" | "bad-payload";
      }[] = [];
      await database.transaction(async (transaction) => {
        for (const { kind, setting } of reading) {
          const outcome = kind.accrue({
            eventId: event.id,
            occurredAt: event.occurredAt,
            params: setting.params,
            payload: event.payload,
          });
          if (!outcome.ok) {
            skipped.push({
              programKey: setting.programKey,
              reason: outcome.reason,
            });
            continue;
          }
          if (outcome.drafts.length === 0) continue;
          const written = await transaction
            .insert(rewardEntries)
            .values(
              outcome.drafts.map((draft) => ({
                amount: draft.amount,
                assetKey: draft.assetKey,
                beneficiaryId: draft.beneficiaryId,
                id: newId(),
                kind: "accrual" as const,
                occurredAt: event.occurredAt,
                payableAt: new Date(
                  event.occurredAt.getTime() + setting.maturitySeconds * 1000,
                ),
                programKey: setting.programKey,
                settingId: setting.id,
                sourceKey: draft.sourceKey,
              })),
            )
            .onConflictDoNothing({
              target: [rewardEntries.programKey, rewardEntries.sourceKey],
            })
            .returning({ id: rewardEntries.id });
          accrued += written.length;
          duplicates += outcome.drafts.length - written.length;
        }
      });
      return { accrued, duplicates, skipped };
    },

    // Undoes an earning with a new entry of the opposite amount (the earning itself is never changed). The reversal matures with the earning,
    // or now if that has passed, so the two reach the payable pot together and net to nothing; if the earning was already paid, the
    // reversal is a debt that later earnings pay off first. Once only: a second reversal of the same earning writes nothing.
    // `within`, when given, runs in the same transaction once the reversal is written (and not when there was nothing to write), so whatever
    // the caller keeps about it (who did it and why) exists exactly when the reversal does.
    async reverse(input: {
      readonly programKey: string;
      readonly sourceKey: string;
      readonly within?: (
        transaction: DatabaseTransaction,
        written: { readonly earningId: string; readonly reversalId: string },
      ) => Promise<void>;
    }): Promise<ReverseResult> {
      return database.transaction(async (transaction) => {
        const [original] = await transaction
          .select()
          .from(rewardEntries)
          .where(
            and(
              eq(rewardEntries.programKey, input.programKey),
              eq(rewardEntries.sourceKey, input.sourceKey),
              eq(rewardEntries.kind, "accrual"),
            ),
          );
        if (original === undefined) return { kind: "not-found" } as const;
        const now = clock();
        const written = await transaction
          .insert(rewardEntries)
          .values({
            amount: -original.amount,
            assetKey: original.assetKey,
            beneficiaryId: original.beneficiaryId,
            id: newId(),
            kind: "reversal",
            occurredAt: now,
            payableAt: original.payableAt > now ? original.payableAt : now,
            programKey: original.programKey,
            reversesEntryId: original.id,
            settingId: original.settingId,
            sourceKey: `reversal:${original.id}`,
          })
          .onConflictDoNothing()
          .returning({ id: rewardEntries.id });
        const [reversal] = written;
        if (reversal === undefined)
          return { kind: "already-reversed" } as const;
        await input.within?.(transaction, {
          earningId: original.id,
          reversalId: reversal.id,
        });
        return { entryId: reversal.id, kind: "reversed" } as const;
      });
    },
  };
}
