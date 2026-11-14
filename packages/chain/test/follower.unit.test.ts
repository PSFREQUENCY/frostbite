import type {
  BroadcastOutcome,
  Observation,
  SignedTransaction,
  UnsignedTransaction,
} from "@frostbite/shared/chain";
import { chainRefSchema, chainFamilyIdSchema } from "@frostbite/shared/chain";
import { describe, expect, it, vi } from "vitest";

import type { TransactionBuilder } from "../src/ports.ts";

import {
  createFollower,
  neverReceivedReason,
  type FollowChange,
  type FollowedRecord,
} from "../src/follower.ts";

const chain = chainRefSchema.parse("simnet:one");
const now = new Date("2026-11-14T12:00:00.000Z");
const unsigned: UnsignedTransaction = {
  chain,
  family: chainFamilyIdSchema.parse("simulated"),
  format: "f",
  payload: "p",
  summary: {
    chain,
    expiresAt: "2026-11-14T13:00:00.000Z",
    fee: { asset: { chain, id: "sim", kind: "native" }, baseUnits: 1n },
    operation: "transfer",
  },
};
const signed: SignedTransaction = {
  chain,
  family: unsigned.family,
  format: "f",
  payload: "p.sig",
};

type Held = FollowedRecord & { failureReason?: string | null };

function setup(start: Partial<Held> = {}) {
  const clock = { now };
  let record: Held = {
    broadcastAt: null,
    chain,
    expiresAt: new Date(now.getTime() + 3_600_000),
    id: "r1",
    signedPayload: null,
    state: "awaiting_signature",
    transactionId: null,
    unsigned,
    ...start,
  };
  const ports = {
    broadcaster: {
      broadcast: vi.fn(async (): Promise<BroadcastOutcome> => ({
        kind: "accepted",
        ref: { chain, id: "tx1" },
      })),
    },
    builder: {
      verifySigned: vi.fn(
        (): ReturnType<TransactionBuilder["verifySigned"]> => ({ ok: true }),
      ),
    },
    observer: {
      observe: vi.fn(async (): Promise<Observation> => ({
        confirmations: 0,
        observedAt: now.toISOString(),
        provider: "t",
        ref: { chain, id: "tx1" },
        status: "pending",
      })),
    },
  };
  let served: typeof ports | null = ports;
  const follower = createFollower<Held>({
    clock: () => clock.now,
    delay: { maxUnsettledMs: 3_600_000 },
    get: async () => record,
    ports: () => served,
    update: async (_id, decide) => {
      const change: FollowChange | null = decide(record);
      if (change !== null)
        record = {
          ...record,
          ...("failureReason" in change
            ? { failureReason: change.failureReason }
            : {}),
          signedPayload: change.signedPayload ?? record.signedPayload,
          state: change.state,
          transactionId: change.transactionId ?? record.transactionId,
          ...(change.state === "broadcast_accepted" ||
          change.state === "broadcast_unknown"
            ? { broadcastAt: record.broadcastAt ?? clock.now }
            : {}),
        };
      return record;
    },
  });
  return {
    clock,
    follower,
    ports,
    record: () => record,
    unserve: () => {
      served = null;
    },
  };
}

describe("taking a built transaction from a signature to the chain", () => {
  it("checks what was signed against what was built, keeps it, sends it, and holds the id the network gave", async () => {
    const t = setup();
    const result = await t.follower.submit({
      id: "r1",
      signed,
      submittedBy: "staff",
    });
    expect(result).toMatchObject({
      ok: true,
      record: {
        signedPayload: "p.sig",
        state: "broadcast_accepted",
        transactionId: "tx1",
      },
    });
    expect(t.ports.builder.verifySigned).toHaveBeenCalledWith(unsigned, signed);
  });

  it("refuses a signature that does not match, leaving the record to be signed", async () => {
    const t = setup();
    t.ports.builder.verifySigned.mockReturnValue({
      ok: false,
      reason: "summary-mismatch",
    });
    expect(
      await t.follower.submit({ id: "r1", signed, submittedBy: "s" }),
    ).toEqual({
      code: "invalid-signature",
      ok: false,
      reason: "summary-mismatch",
    });
    expect(t.record().state).toBe("awaiting_signature");
    expect(t.ports.broadcaster.broadcast).not.toHaveBeenCalled();
  });

  it("lets a record that ran out of time expire, and refuses what is not waiting unless it is the same signed bytes", async () => {
    const late = setup({ expiresAt: new Date(now.getTime() - 1) });
    expect(
      await late.follower.submit({ id: "r1", signed, submittedBy: "s" }),
    ).toEqual({ code: "expired", ok: false });
    expect(late.record().state).toBe("expired");
    const sent = setup({
      signedPayload: "p.sig",
      state: "broadcast_accepted",
      transactionId: "tx1",
    });
    expect(
      await sent.follower.submit({ id: "r1", signed, submittedBy: "s" }),
    ).toMatchObject({ ok: true });
    expect(
      await sent.follower.submit({
        id: "r1",
        signed: { ...signed, payload: "other" },
        submittedBy: "s",
      }),
    ).toEqual({ code: "not-awaiting-signature", ok: false });
  });

  it("says when the chain is not served or cannot be reached, and when there is no such record", async () => {
    const none = setup();
    none.unserve();
    expect(
      await none.follower.submit({ id: "r1", signed, submittedBy: "s" }),
    ).toEqual({ code: "chain-unavailable", ok: false });
    const down = setup();
    down.ports.broadcaster.broadcast.mockRejectedValue(new Error("offline"));
    expect(
      await down.follower.submit({ id: "r1", signed, submittedBy: "s" }),
    ).toEqual({ code: "chain-unavailable", ok: false });
    const gone = createFollower<Held>({
      clock: () => now,
      delay: { maxUnsettledMs: 1 },
      get: async () => null,
      ports: () => null,
      update: async () => null,
    });
    expect(await gone.submit({ id: "x", signed, submittedBy: "s" })).toEqual({
      code: "not-found",
      ok: false,
    });
    expect(await gone.refresh("x", () => null)).toEqual({
      code: "not-found",
      ok: false,
    });
  });
});

describe("following a record to the chain", () => {
  it("sends a signed record that was never sent, and moves a sent one as the network shows it: pending, then confirmed", async () => {
    const t = setup({ signedPayload: "p.sig", state: "signed" });
    expect(await t.follower.refresh("r1", () => null)).toMatchObject({
      ok: true,
      record: { state: "broadcast_accepted" },
    });
    expect(await t.follower.refresh("r1", () => null)).toMatchObject({
      record: { state: "pending" },
    });
    t.ports.observer.observe.mockResolvedValue({
      block: undefined,
      confirmations: 3,
      observedAt: now.toISOString(),
      provider: "t",
      ref: { chain, id: "tx1" },
      status: "confirmed",
    } as unknown as Observation);
    expect(await t.follower.refresh("r1", () => null)).toMatchObject({
      record: { state: "confirmed" },
    });
  });

  it("asks the one that follows it what a confirmed record becomes", async () => {
    const t = setup({ state: "confirmed", transactionId: "tx1" });
    expect(
      await t.follower.refresh("r1", () => ({ state: "complete" })),
    ).toMatchObject({ record: { state: "complete" } });
  });

  it("ends a record the network reverted, as failed", async () => {
    const t = setup({
      broadcastAt: now,
      signedPayload: "p.sig",
      state: "pending",
      transactionId: "tx1",
    });
    t.ports.observer.observe.mockResolvedValue({
      confirmations: 1,
      observedAt: now.toISOString(),
      provider: "t",
      ref: { chain, id: "tx1" },
      status: "reverted",
    } as unknown as Observation);
    expect(await t.follower.refresh("r1", () => null)).toMatchObject({
      record: {
        failureReason: "reverted by the network",
        state: "indexed_failure",
      },
    });
  });

  it("sends again a record the network is not seen to hold, and gives it up after the time any wait is called delayed", async () => {
    const t = setup({
      broadcastAt: now,
      signedPayload: "p.sig",
      state: "broadcast_unknown",
      transactionId: "tx1",
    });
    t.ports.broadcaster.broadcast.mockResolvedValue({
      kind: "unavailable",
    });
    t.ports.observer.observe.mockResolvedValue({
      confirmations: 0,
      observedAt: now.toISOString(),
      provider: "t",
      ref: { chain, id: "tx1" },
      status: "not-found",
    } as unknown as Observation);
    expect(await t.follower.refresh("r1", () => null)).toMatchObject({
      record: { state: "broadcast_unknown" },
    });
    t.clock.now = new Date(now.getTime() + 3_600_001);
    expect(await t.follower.refresh("r1", () => null)).toMatchObject({
      record: {
        failureReason: neverReceivedReason,
        state: "broadcast_rejected",
      },
    });
  });

  it("lets an unsigned record that ran out of time expire, leaves one that has not, and one that is settled", async () => {
    const lapsed = setup({ expiresAt: new Date(now.getTime() - 1) });
    expect(await lapsed.follower.refresh("r1", () => null)).toMatchObject({
      record: { state: "expired" },
    });
    const waiting = setup();
    expect(await waiting.follower.refresh("r1", () => null)).toMatchObject({
      record: { state: "awaiting_signature" },
    });
    const done = setup({ state: "complete", transactionId: "tx1" });
    expect(await done.follower.refresh("r1", () => null)).toMatchObject({
      record: { state: "complete" },
    });
  });

  it("says when the chain is not served or cannot be asked", async () => {
    const t = setup({ state: "pending", transactionId: "tx1" });
    t.ports.observer.observe.mockRejectedValue(new Error("down"));
    expect(await t.follower.refresh("r1", () => null)).toEqual({
      code: "chain-unavailable",
      ok: false,
    });
    t.unserve();
    expect(await t.follower.refresh("r1", () => null)).toEqual({
      code: "chain-unavailable",
      ok: false,
    });
  });
});
