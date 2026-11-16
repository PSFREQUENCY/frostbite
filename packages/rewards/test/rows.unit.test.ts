import { describe, expect, it } from "vitest";

import { createDispatcher, createExecutorRegistry } from "../src/executors.ts";
import { onlyRow } from "../src/rows.ts";
import type { Payout } from "../src/types.ts";

describe("the one row a write gives back", () => {
  it("is the row, and a loud failure when there is none", () => {
    expect(onlyRow([1, 2], "thing")).toBe(1);
    expect(() => onlyRow([], "payout")).toThrow("The payout was not stored.");
  });
});

describe("handing a payout on when the payout is no longer there", () => {
  const payout: Payout = {
    amount: 5n,
    assetKey: "a/native/b",
    beneficiaryId: "p",
    completedAt: null,
    createdAt: new Date(0),
    destination: "x",
    executor: null,
    executorRef: null,
    failureReason: null,
    id: "pay",
    programKey: "k",
    state: "requested",
    updatedAt: new Date(0),
  };

  it("is a fault, not an answer: a payout is never deleted, so a move that finds none is loud", async () => {
    const gone = () => Promise.resolve({ kind: "not-found" as const });
    const vanished = {
      begin: gone,
      complete: gone,
      fail: gone,
      payout: () => Promise.resolve(payout),
    };
    const dispatcher = createDispatcher({
      executors: createExecutorRegistry([
        {
          id: "e",
          start: () => Promise.resolve({ kind: "accepted" }),
          supports: () => true,
        },
      ]),
      payouts: vanished,
    });
    await expect(dispatcher.dispatch("pay")).rejects.toThrow(/disappeared/u);
  });
});
