import type { DatabaseClient } from "@frostbite/database/connection";
import {
  rewardEntries,
  rewardPayouts,
} from "@frostbite/database/schema/rewards";
import { and, eq, isNull, lte, sql } from "drizzle-orm";

import type { PayoutStore } from "./payout-store.ts";
import { onlyRow } from "./rows.ts";
import { toPayout } from "./payout-store.ts";
import type { Programs } from "./programs.ts";
import type { Payout } from "./types.ts";

export interface PayoutRequest {
  readonly assetKey: string;
  readonly beneficiaryId: string;
  // Where it is to be paid (an address); the caller has checked it for the asset's chain.
  readonly destination: string;
  readonly programKey: string;
}

export type RequestPayoutResult =
  | { readonly kind: "requested"; readonly payout: Payout }
  | { readonly kind: "already-open"; readonly payout: Payout }
  | {
      readonly kind: "below-minimum";
      readonly minimum: bigint;
      readonly payable: bigint;
    }
  | { readonly kind: "invalid-destination" | "unknown-program" };

const destinationLimit = 256;

export function createPayoutRequests(dependencies: {
  readonly clock: () => Date;
  readonly database: DatabaseClient;
  readonly newId: () => string;
  readonly programs: Programs;
  readonly store: PayoutStore;
}) {
  const { clock, database, newId, programs, store } = dependencies;

  return {
    // A person asks to be paid what is payable now under a program. All of it is taken (net of any reversals), at once, or none: it must reach
    // the minimum the program has in force, and only one payout is open for a person, program and asset at a time. Under a lock, so two
    // asks at once make one payout.
    async request(input: PayoutRequest): Promise<RequestPayoutResult> {
      if (
        input.destination.trim() === "" ||
        input.destination.length > destinationLimit
      )
        return { kind: "invalid-destination" };
      const setting = await programs.inForce(input.programKey);
      if (setting === null) return { kind: "unknown-program" };
      return database.transaction(async (transaction) => {
        await transaction.execute(
          sql`select pg_advisory_xact_lock(hashtextextended(${`rewards-payout:${input.beneficiaryId}:${input.programKey}:${input.assetKey}`}, 0))`,
        );
        const [open] = await transaction
          .select()
          .from(rewardPayouts)
          .where(
            and(
              eq(rewardPayouts.beneficiaryId, input.beneficiaryId),
              eq(rewardPayouts.programKey, input.programKey),
              eq(rewardPayouts.assetKey, input.assetKey),
              sql`${rewardPayouts.state} in ('requested', 'in_progress')`,
            ),
          );
        if (open !== undefined)
          return { kind: "already-open", payout: toPayout(open) } as const;
        const now = clock();
        const payable = await transaction
          .select({ amount: rewardEntries.amount, id: rewardEntries.id })
          .from(rewardEntries)
          .where(
            and(
              eq(rewardEntries.beneficiaryId, input.beneficiaryId),
              eq(rewardEntries.programKey, input.programKey),
              eq(rewardEntries.assetKey, input.assetKey),
              isNull(rewardEntries.payoutId),
              lte(rewardEntries.payableAt, now),
            ),
          )
          .for("update");
        const total = payable.reduce((sum, { amount }) => sum + amount, 0n);
        if (total <= 0n || total < setting.minimumPayout)
          return {
            kind: "below-minimum",
            minimum: setting.minimumPayout,
            payable: total,
          } as const;
        const id = newId();
        const created = onlyRow(
          await transaction
            .insert(rewardPayouts)
            .values({
              amount: total,
              assetKey: input.assetKey,
              beneficiaryId: input.beneficiaryId,
              createdAt: now,
              destination: input.destination,
              id,
              programKey: input.programKey,
              state: "requested",
              updatedAt: now,
            })
            .returning(),
          "payout",
        );
        await transaction
          .update(rewardEntries)
          .set({ payoutId: id })
          .where(
            sql`${rewardEntries.id} in (${sql.join(
              payable.map(({ id: entryId }) => sql`${entryId}`),
              sql`, `,
            )})`,
          );
        await store.record(transaction, id, null, "requested", {}, null);
        return { kind: "requested", payout: toPayout(created) } as const;
      });
    },
  };
}
