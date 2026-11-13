import {
  toPayout,
  type MoveResult,
  type PayoutStore,
  type Who,
} from "./payout-store.ts";

// The life of a payout after it is asked for: an executor takes it, then it is paid or it is not. Each move is idempotent where repeating it
// can be, and refuses where it cannot.
export function createPayoutMoves(store: PayoutStore, clock: () => Date) {
  const { change, move, release } = store;

  return {
    // Starts the carrying out: requested to in progress, and the executor that has it. Asking again with the same executor changes nothing.
    begin: (id: string, input: Who & { readonly executor: string }) =>
      move(id, async (transaction, row): Promise<MoveResult> => {
        if (row.state === "in_progress" && row.executor === input.executor)
          return { kind: "unchanged", payout: toPayout(row) };
        if (row.state !== "requested")
          return { kind: "wrong-state", payout: toPayout(row) };
        return {
          kind: "moved",
          payout: await change(transaction, row, "in_progress", input, null, {
            executor: input.executor,
          }),
        };
      }),

    // Only from requested (before any executor has it): the person or staff change their mind. The entries go back to the pot.
    cancel: (id: string, input: Who & { readonly reason: string }) =>
      move(id, async (transaction, row): Promise<MoveResult> => {
        if (row.state === "cancelled")
          return { kind: "unchanged", payout: toPayout(row) };
        if (row.state !== "requested")
          return { kind: "wrong-state", payout: toPayout(row) };
        await release(transaction, row.id);
        return {
          kind: "moved",
          payout: await change(
            transaction,
            row,
            "cancelled",
            input,
            input.reason,
            {},
          ),
        };
      }),

    // The executor says it is paid, with what paid it. The same reference again changes nothing; a different one is a conflict.
    complete: (id: string, input: Who & { readonly ref: string }) =>
      move(id, async (transaction, row): Promise<MoveResult> => {
        if (row.state === "complete")
          return {
            kind: row.executorRef === input.ref ? "unchanged" : "conflict",
            payout: toPayout(row),
          };
        if (row.state !== "in_progress")
          return { kind: "wrong-state", payout: toPayout(row) };
        return {
          kind: "moved",
          payout: await change(transaction, row, "complete", input, null, {
            completedAt: clock(),
            executorRef: input.ref,
          }),
        };
      }),

    // The payout did not happen (the executor refused, or it was found not to have): the entries go back to the pot to be asked for again.
    fail: (id: string, input: Who & { readonly reason: string }) =>
      move(id, async (transaction, row): Promise<MoveResult> => {
        if (row.state === "failed")
          return { kind: "unchanged", payout: toPayout(row) };
        if (row.state !== "requested" && row.state !== "in_progress")
          return { kind: "wrong-state", payout: toPayout(row) };
        await release(transaction, row.id);
        return {
          kind: "moved",
          payout: await change(
            transaction,
            row,
            "failed",
            input,
            input.reason,
            { failureReason: input.reason },
          ),
        };
      }),
  };
}
