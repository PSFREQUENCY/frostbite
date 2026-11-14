import type { StoredBatch } from "@frostbite/referrals";
import { simulatedAddress } from "@frostbite/test-kit/simulated-chain-address";
import type { UnsignedTransaction } from "@frostbite/shared/chain";
import { describe, expect, it } from "vitest";

import { toWireBatch } from "../src/application/present.ts";
import {
  refreshRefusalCopy,
  settledBatch,
  startRefusalCopy,
  submitRefusalCopy,
  totalLine,
} from "../src/domain/batch-copy.ts";
import { addressOf, servedChain } from "./support/config.ts";
import { batchOf } from "./support/batch.ts";

const asset = { chain: servedChain, id: "sim", kind: "native" } as const;
const unsigned: UnsignedTransaction = {
  chain: servedChain,
  family: "simulated" as UnsignedTransaction["family"],
  format: "sim-json/1",
  payload: "unsigned-payload",
  summary: {
    chain: servedChain,
    expiresAt: "2026-11-14T13:00:00.000Z",
    fee: { asset, baseUnits: 500n },
    operation: "pay-batch",
    payments: [
      {
        amount: { asset, baseUnits: 20_000n },
        recipient: simulatedAddress(servedChain, "aa"),
      },
      {
        amount: { asset, baseUnits: 30_000n },
        recipient: simulatedAddress(servedChain, "bb"),
      },
    ],
  },
};
const stored = (change: Partial<StoredBatch> = {}): StoredBatch => ({
  assetKey: `${servedChain}/native/sim`,
  broadcastAt: null,
  chain: servedChain,
  createdAt: new Date("2026-11-14T12:00:00.000Z"),
  createdBy: null,
  expiresAt: new Date("2026-11-14T13:00:00.000Z"),
  failureReason: null,
  id: "b1",
  payoutIds: [],
  signedPayload: null,
  state: "awaiting_signature",
  submittedBy: null,
  transactionId: null,
  unsigned,
  updatedAt: new Date("2026-11-14T12:00:00.000Z"),
  ...change,
});

describe("a batch as staff are shown it", () => {
  it("lists each payment, the sum and the network fee, and holds the transaction only while it awaits a signature", () => {
    const shown = toWireBatch(stored());
    expect(shown).toMatchObject({
      feeUnits: "500",
      payments: [
        { recipient: addressOf("aa"), units: "20000" },
        { recipient: addressOf("bb"), units: "30000" },
      ],
      sentAt: null,
      state: "awaiting_signature",
      toSign: { payload: "unsigned-payload" },
      totalUnits: "50000",
    });
    const sent = toWireBatch(
      stored({
        broadcastAt: new Date("2026-11-14T12:05:00.000Z"),
        state: "broadcast_accepted",
        transactionId: "tx1",
      }),
    );
    expect(sent).toMatchObject({
      sentAt: "2026-11-14T12:05:00.000Z",
      toSign: null,
      transactionId: "tx1",
    });
  });

  it("tells the states a batch never rests in as the neighbour they lead to, and never as paid before the network says so", () => {
    const told = (state: StoredBatch["state"]) =>
      toWireBatch(stored({ state })).state;
    expect(told("constructed")).toBe("awaiting_signature");
    expect(told("simulated")).toBe("awaiting_signature");
    expect(told("indexed_success")).toBe("confirmed");
    expect(told("reconciled")).toBe("confirmed");
    expect(told("pending")).toBe("pending");
    expect(told("complete")).toBe("complete");
  });

  it("shows no payments for a transaction that holds none", () => {
    const bare = {
      chain: servedChain,
      expiresAt: unsigned.summary.expiresAt,
      fee: unsigned.summary.fee,
      operation: "transfer",
    } as const;
    const shown = toWireBatch(
      stored({ unsigned: { ...unsigned, summary: bare } }),
    );
    expect(shown.payments).toEqual([]);
    expect(shown.totalUnits).toBe("0");
  });
});

describe("the words of a batch", () => {
  it("name every refusal differently, so staff are told what to do and not only that it failed", () => {
    const start = (
      [
        "cannot-pay",
        "chain-unavailable",
        "costs-more-than-it-pays",
        "could-not-build",
        "invalid-sender",
        "nothing-to-pay",
      ] as const
    ).map((reason) =>
      startRefusalCopy({ reason, skipped: [], status: "refused" }),
    );
    expect(new Set(start).size).toBe(start.length);
    expect(
      startRefusalCopy({
        detail: "short by 5",
        reason: "cannot-pay",
        skipped: [],
        status: "refused",
      }),
    ).toContain("(short by 5)");
    expect(
      startRefusalCopy({
        detail: "no fee",
        reason: "could-not-build",
        skipped: [],
        status: "refused",
      }),
    ).toContain("(no fee)");
    const submit = (
      [
        "chain-unavailable",
        "expired",
        "invalid-signature",
        "not-awaiting-signature",
        "not-found",
      ] as const
    ).map((reason) => submitRefusalCopy({ reason, status: "refused" }));
    expect(new Set(submit).size).toBe(submit.length);
    expect(
      refreshRefusalCopy({ reason: "not-found", status: "refused" }),
    ).not.toBe(
      refreshRefusalCopy({ reason: "chain-unavailable", status: "refused" }),
    );
  });

  it("counts payments in the singular and the plural", () => {
    expect(totalLine(batchOf())).toContain("2 payments, 50,000 sats in all");
    expect(
      totalLine(
        batchOf({
          payments: [{ recipient: "r", units: "1" }],
          totalUnits: "1",
        }),
      ),
    ).toContain("1 payment, ");
  });

  it("calls a batch over once it paid, expired, was refused or failed, and not before", () => {
    for (const state of [
      "complete",
      "expired",
      "broadcast_rejected",
      "indexed_failure",
    ] as const)
      expect(settledBatch(state)).toBe(true);
    for (const state of [
      "awaiting_signature",
      "signed",
      "broadcast_accepted",
      "broadcast_unknown",
      "pending",
      "confirmed",
    ] as const)
      expect(settledBatch(state)).toBe(false);
  });
});
