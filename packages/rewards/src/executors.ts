import type { MoveResult } from "./payout-store.ts";
import type { Payouts } from "./payouts.ts";
import type { Payout } from "./types.ts";

// What an executor answers when it is handed a payout: it has it and will report back later (a staff-signed batch waits for a person), it is
// already paid and says with what, or it refuses (and the entries go back to the pot).
export type ExecutorStart =
  | { readonly kind: "accepted" }
  | { readonly kind: "completed"; readonly ref: string }
  | { readonly kind: "refused"; readonly reason: string };

// HOW a payout is paid. The ledger knows what is owed and the state a payout is in; an executor knows a way of paying one asset: a transaction
// staff sign, an automatic signer, an item minted. Adding a way to pay is writing one of these and listing it in the registry.
export interface PayoutExecutor {
  readonly id: string;
  readonly start: (payout: Payout) => Promise<ExecutorStart>;
  readonly supports: (assetKey: string) => boolean;
}

export type DispatchResult =
  | {
      readonly kind: "accepted" | "completed" | "refused";
      readonly payout: Payout;
    }
  | { readonly kind: "no-executor" | "not-found"; readonly payout?: Payout }
  | { readonly kind: "not-requested"; readonly payout: Payout }
  // The executor threw after being handed the payout: it may have started, so the payout is left in progress for someone to look at,
  // never failed (which would put its entries back to be paid twice).
  | {
      readonly error: Error;
      readonly kind: "executor-error";
      readonly payout: Payout;
    };

export interface ExecutorRegistry {
  readonly forAsset: (assetKey: string) => PayoutExecutor | undefined;
  readonly ids: () => readonly string[];
}

export function createExecutorRegistry(
  executors: readonly PayoutExecutor[],
): ExecutorRegistry {
  const seen = new Set<string>();
  for (const executor of executors) {
    if (seen.has(executor.id))
      throw new Error(`Two payout executors are named "${executor.id}".`);
    seen.add(executor.id);
  }
  return {
    forAsset: (assetKey) =>
      executors.find((candidate) => candidate.supports(assetKey)),
    ids: () => executors.map(({ id }) => id),
  };
}

function payoutOf(result: MoveResult): Payout {
  if (result.kind === "not-found")
    throw new Error("The payout disappeared while it was being handed on.");
  return result.payout;
}

// Hands a requested payout to the executor for its asset. The payout is marked in progress BEFORE the executor is asked, so a crash after
// the asking leaves a payout somebody can see rather than one that could be asked twice.
export function createDispatcher(dependencies: {
  readonly executors: ExecutorRegistry;
  readonly payouts: Pick<Payouts, "begin" | "complete" | "fail" | "payout">;
}) {
  const { executors, payouts } = dependencies;

  return {
    async dispatch(payoutId: string): Promise<DispatchResult> {
      const payout = await payouts.payout(payoutId);
      if (payout === null) return { kind: "not-found" };
      if (payout.state !== "requested")
        return { kind: "not-requested", payout };
      const executor = executors.forAsset(payout.assetKey);
      if (executor === undefined) {
        const failed = await payouts.fail(payoutId, {
          reason: "no-executor",
        });
        return { kind: "no-executor", payout: payoutOf(failed) };
      }
      const begun = payoutOf(
        await payouts.begin(payoutId, { executor: executor.id }),
      );
      let started: ExecutorStart;
      try {
        started = await executor.start(begun);
      } catch (error) {
        return {
          error:
            error instanceof Error ? error : new Error("The executor failed."),
          kind: "executor-error",
          payout: begun,
        };
      }
      if (started.kind === "accepted")
        return { kind: "accepted", payout: begun };
      if (started.kind === "completed")
        return {
          kind: "completed",
          payout: payoutOf(
            await payouts.complete(payoutId, { ref: started.ref }),
          ),
        };
      return {
        kind: "refused",
        payout: payoutOf(
          await payouts.fail(payoutId, { reason: started.reason }),
        ),
      };
    },
  };
}
