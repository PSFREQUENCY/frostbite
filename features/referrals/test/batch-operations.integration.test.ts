import { randomUUID } from "node:crypto";

import { signSimulated } from "@frostbite/test-kit/simulated-chain-transaction";
import {
  referralBatchRoutes,
  referralPayCapability,
} from "@frostbite/shared/referrals";
import { describe, expect, it } from "vitest";

import {
  createCoverOperation,
  createRefreshBatchOperation,
  createStartBatchOperation,
  createSubmitBatchOperation,
} from "../src/application/batch-operations.ts";
import { createReferralsResolver } from "../src/runtime.ts";
import {
  addressOf,
  featureConfig,
  servedChain,
  sim,
} from "./support/config.ts";
import {
  clock,
  earn,
  reads,
  registerDatabase,
  seedUser,
} from "./support/database.ts";

registerDatabase();

const resolve = createReferralsResolver(
  featureConfig(),
  process.env,
  () => clock.now,
);
const start = createStartBatchOperation(resolve);
const submit = createSubmitBatchOperation(resolve);
const refresh = createRefreshBatchOperation(resolve);
const cover = createCoverOperation(resolve);
const as = (actorUserId: string | null) => ({
  actorSession: null,
  actorUserId: actorUserId as never,
  correlationId: "c0ffee00-0000-4000-8000-000000000000" as never,
});
const assetKey = `${servedChain}/native/sim`;
const treasury = addressOf("a1b2c3");
sim.controls.fund(servedChain, treasury, 1_000_000n);

// A referrer who earned and asked to be paid, so a payout waits for a batch.
async function waiting(to = addressOf("0a0b0c")) {
  const admin = await seedUser();
  clock.now = new Date(clock.now.getTime() + 1_000);
  await reads.program.set(admin, {
    enabled: true,
    maturitySeconds: 0,
    minimumPayout: 0n,
    rateBasisPoints: 300,
  });
  const referrer = await seedUser();
  await earn(referrer, 10_000n, randomUUID());
  const asked = await reads.rewards.payouts.request({
    assetKey,
    beneficiaryId: referrer,
    destination: to,
    programKey: "referral",
  });
  if (asked.kind !== "requested") throw new Error(asked.kind);
  return asked.payout;
}
const wire = (value: unknown) => {
  const result = value as { ok: true; value: Record<string, unknown> };
  if (!result.ok) throw new Error("the operation turned the caller away");
  return result.value;
};

describe("the operations that pay referrers", () => {
  it("need the payment capability, are posts of JSON on their routes, and turn away a caller who is not signed in", async () => {
    for (const [operation, route] of [
      [start, referralBatchRoutes.start],
      [submit, referralBatchRoutes.submit],
      [refresh, referralBatchRoutes.refresh],
    ] as const)
      expect(operation).toMatchObject({
        access: { capability: referralPayCapability, kind: "platform" },
        idempotency: "none",
        input: "json",
        ...route,
      });
    expect(
      await start.execute({ assetKey, wallet: treasury }, as(null)),
    ).toMatchObject({ ok: false });
    expect(
      await submit.execute(
        {
          batchId: randomUUID(),
          signed: { chain: "x", family: "y", format: "z", payload: "p" },
        },
        as(null),
      ),
    ).toMatchObject({ ok: false });
    expect(
      await refresh.execute({ batchId: randomUUID() }, as(null)),
    ).toMatchObject({ ok: false });
  });

  it("builds a batch for staff to sign, shows each payment, the sum and the network fee, and offers the transaction only while it awaits a signature", async () => {
    const staff = await seedUser();
    const payout = await waiting();
    const answer = wire(
      await start.execute({ assetKey, wallet: treasury }, as(staff)),
    );
    expect(answer).toMatchObject({ resumed: false, status: "started" });
    const batch = answer.batch as {
      feeUnits: string;
      id: string;
      payments: { recipient: string; units: string }[];
      state: string;
      toSign: { payload: string } | null;
      totalUnits: string;
    };
    expect(batch.state).toBe("awaiting_signature");
    expect(batch.toSign).not.toBeNull();
    expect(batch.feeUnits).toBe("1");
    expect(batch.payments.map(({ recipient }) => recipient)).toContain(
      payout.destination,
    );
    expect(BigInt(batch.totalUnits)).toBeGreaterThanOrEqual(payout.amount);

    const signed = signSimulated({
      chain: servedChain,
      family: "simulated" as never,
      format: "sim-json/1",
      payload: (batch.toSign as { payload: string }).payload,
      summary: {} as never,
    });
    const sent = wire(
      await submit.execute({ batchId: batch.id, signed }, as(staff)),
    );
    expect(sent).toMatchObject({
      batch: { state: "broadcast_accepted", toSign: null },
      status: "submitted",
    });
    sim.controls.advance(servedChain, 4);
    const first = wire(await refresh.execute({ batchId: batch.id }, as(staff)));
    expect(first).toMatchObject({
      batch: { state: "confirmed" },
      status: "ok",
    });
    const done = wire(await refresh.execute({ batchId: batch.id }, as(staff)));
    expect(done).toMatchObject({ batch: { state: "complete" }, status: "ok" });
    expect((await reads.rewards.payouts.payout(payout.id))?.state).toBe(
      "complete",
    );
  });

  it("answers why a batch cannot be built, and what cannot be submitted or looked at", async () => {
    const staff = await seedUser();
    expect(
      wire(await start.execute({ assetKey, wallet: "nobody" }, as(staff))),
    ).toEqual({
      reason: "invalid-sender",
      skipped: [],
      status: "refused",
    });
    expect(
      wire(
        await start.execute(
          { assetKey: "simnet:two/native/sim", wallet: treasury },
          as(staff),
        ),
      ),
    ).toMatchObject({ reason: "chain-unavailable", status: "refused" });
    expect(
      wire(
        await submit.execute(
          {
            batchId: randomUUID(),
            signed: {
              chain: servedChain,
              family: "simulated",
              format: "f",
              payload: "p",
            },
          },
          as(staff),
        ),
      ),
    ).toEqual({ reason: "not-found", status: "refused" });
    expect(
      wire(await refresh.execute({ batchId: randomUUID() }, as(staff))),
    ).toEqual({ reason: "not-found", status: "refused" });
  });

  it("says what the paying wallet holds against what waits, as a read, before a batch is built", async () => {
    const payout = await waiting();
    const looked = wire(await cover.execute({ assetKey, wallet: treasury }));
    expect(looked).toMatchObject({
      heldUnits: "1000000",
      pendingUnits: "0",
      status: "ok",
    });
    expect(Number(looked.payments)).toBeGreaterThanOrEqual(1);
    expect(BigInt(String(looked.waitingUnits))).toBeGreaterThanOrEqual(
      payout.amount,
    );
    const empty = wire(
      await cover.execute({ assetKey, wallet: addressOf("ffffff") }),
    );
    expect(empty).toMatchObject({ heldUnits: "0", status: "ok" });
  });

  it("says when the wallet is not an address, the network is not served or cannot be asked, and is for staff who may pay", async () => {
    expect(wire(await cover.execute({ assetKey, wallet: "nobody" }))).toEqual({
      reason: "invalid-wallet",
      status: "refused",
    });
    expect(
      wire(
        await cover.execute({
          assetKey: "simnet:two/native/sim",
          wallet: treasury,
        }),
      ),
    ).toEqual({ reason: "chain-unavailable", status: "refused" });
    expect(
      wire(await cover.execute({ assetKey, wallet: "down-codec" })),
    ).toEqual({ reason: "chain-unavailable", status: "refused" });
    expect(cover).toMatchObject({
      access: { capability: referralPayCapability, kind: "platform" },
      cache: { kind: "no-store" },
      input: "query",
      ...referralBatchRoutes.cover,
    });
  });
});
