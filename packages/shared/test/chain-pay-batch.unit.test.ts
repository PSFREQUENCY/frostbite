import { describe, expect, it } from "vitest";

import {
  chainRefSchema,
  maxBatchPayments,
  transactionIntentSchema,
  transactionSummarySchema,
} from "../src/chain/index.ts";

const chain = chainRefSchema.parse("simnet:one");
const other = chainRefSchema.parse("simnet:two");
const asset = (on = chain) => ({
  chain: on,
  id: "sim",
  kind: "native" as const,
});
const person = (value: string, on = chain) => ({ chain: on, value });
const payment = (value: string, units: bigint, on = chain) => ({
  amount: { asset: asset(on), baseUnits: units },
  recipient: person(value, on),
});
const batch = (payments: readonly ReturnType<typeof payment>[]) => ({
  chain,
  operation: "pay-batch" as const,
  payments,
  sender: person("treasury"),
});

describe("a batch payment intent", () => {
  it("names every payment, who is paid and how much, in order", () => {
    const intent = batch([payment("a", 5n), payment("b", 7n)]);
    expect(transactionIntentSchema.parse(intent)).toEqual(intent);
  });

  it("is refused with no payments, with more than a transaction may hold, and with a payment on another chain", () => {
    expect(transactionIntentSchema.safeParse(batch([])).success).toBe(false);
    expect(
      transactionIntentSchema.safeParse(
        batch(
          Array.from({ length: maxBatchPayments + 1 }, (_, at) =>
            payment(`p${String(at)}`, 1n),
          ),
        ),
      ).success,
    ).toBe(false);
    expect(
      transactionIntentSchema.safeParse(batch([payment("a", 1n, other)]))
        .success,
    ).toBe(false);
  });

  it("is a summary that lists the same payments, on its own chain only", () => {
    const summary = {
      chain,
      expiresAt: "2026-11-14T12:00:00.000Z",
      fee: { asset: asset(), baseUnits: 1n },
      operation: "pay-batch" as const,
      payments: [payment("a", 5n)],
    };
    expect(transactionSummarySchema.parse(summary)).toEqual(summary);
    expect(
      transactionSummarySchema.safeParse({
        ...summary,
        payments: [payment("a", 5n, other)],
      }).success,
    ).toBe(false);
  });
});
