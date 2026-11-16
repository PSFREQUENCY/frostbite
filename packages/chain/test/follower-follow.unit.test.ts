import type { Observation } from "@frostbite/shared/chain";
import { describe, expect, it } from "vitest";

import { neverReceivedReason } from "../src/follower.ts";
import { chain, now, setup } from "./support/follower.ts";

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
