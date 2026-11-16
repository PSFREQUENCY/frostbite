import type {
  BroadcastOutcome,
  Observation,
  SignedTransaction,
  UnsignedTransaction,
} from "@frostbite/shared/chain";
import { chainRefSchema, chainFamilyIdSchema } from "@frostbite/shared/chain";
import { vi } from "vitest";

import type { TransactionBuilder } from "../../src/ports.ts";

import {
  createFollower,
  type FollowChange,
  type FollowedRecord,
} from "../../src/follower.ts";

export const chain = chainRefSchema.parse("simnet:one");
export const now = new Date("2026-11-14T12:00:00.000Z");
export const unsigned: UnsignedTransaction = {
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
export const signed: SignedTransaction = {
  chain,
  family: unsigned.family,
  format: "f",
  payload: "p.sig",
};

export type Held = FollowedRecord & { failureReason?: string | null };

export function setup(start: Partial<Held> = {}) {
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
