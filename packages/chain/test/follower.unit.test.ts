import { createFollower } from "../src/follower.ts";
import { describe, expect, it } from "vitest";

import { now, setup, signed, unsigned, type Held } from "./support/follower.ts";

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
