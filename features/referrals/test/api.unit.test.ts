import type { FetchLike } from "@frostbite/client-http";
import {
  referralAdminRoutes,
  referralBatchRoutes,
} from "@frostbite/shared/referrals";
import { describe, expect, it, vi } from "vitest";

import { createReferralsApi } from "../src/client/api.ts";
import { batchOf, signedTransaction } from "./support/batch.ts";

const json = (body: object) =>
  new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
  });
const sent = (fetchImpl: ReturnType<typeof vi.fn>) => {
  const [path, init] = fetchImpl.mock.calls[0] ?? [];
  return [
    path,
    (init as { method: string }).method,
    JSON.parse(String((init as { body: string }).body)) as object,
  ];
};

describe("the routes as the page reaches them", () => {
  it("sets the program with a post of every setting, validating what comes back", async () => {
    const fetchImpl = vi.fn<FetchLike>(async () => json({ status: "saved" }));
    const input = {
      enabled: true,
      maturitySeconds: 60,
      minimumPayoutUnits: "1000",
      rateBasisPoints: 300,
    };
    expect(await createReferralsApi(fetchImpl).setProgram(input)).toEqual({
      status: "saved",
    });
    expect(sent(fetchImpl)).toEqual([
      referralAdminRoutes.setProgram.path,
      "POST",
      input,
    ]);
  });

  it("freezes a referrer with a post of the person and the reason, and reads a refusal as one", async () => {
    const fetchImpl = vi.fn<FetchLike>(async () =>
      json({ reason: "not-found", status: "refused" }),
    );
    const input = {
      frozen: true,
      reason: "Why",
      referrerId: "0198a5c4-7b3e-7c1a-8f2d-4e5b6a7c8d9e",
    };
    expect(await createReferralsApi(fetchImpl).setFrozen(input)).toEqual({
      reason: "not-found",
      status: "refused",
    });
    expect(sent(fetchImpl)).toEqual([
      referralAdminRoutes.setFrozen.path,
      "POST",
      input,
    ]);
  });

  it("throws what comes back that is not an answer the contract allows", async () => {
    const fetchImpl = vi.fn<FetchLike>(async () => json({ status: "maybe" }));
    await expect(
      createReferralsApi(fetchImpl).setProgram({
        enabled: true,
        maturitySeconds: 0,
        minimumPayoutUnits: "0",
        rateBasisPoints: 300,
      }),
    ).rejects.toBeDefined();
  });

  it("builds, signs and follows a batch with posts to the batch routes, reading each answer against the contract", async () => {
    const batch = batchOf();
    const wallet = { assetKey: "simnet:one/native/sim", wallet: "w" };
    const start = vi.fn<FetchLike>(async () =>
      json({ batch, resumed: false, skipped: [], status: "started" }),
    );
    expect(await createReferralsApi(start).startBatch(wallet)).toMatchObject({
      status: "started",
    });
    expect(sent(start)).toEqual([
      referralBatchRoutes.start.path,
      "POST",
      wallet,
    ]);
    const submit = vi.fn<FetchLike>(async () =>
      json({ batch, status: "submitted" }),
    );
    const signed = { batchId: batch.id, signed: signedTransaction };
    expect(await createReferralsApi(submit).submitBatch(signed)).toMatchObject({
      status: "submitted",
    });
    expect(sent(submit)).toEqual([
      referralBatchRoutes.submit.path,
      "POST",
      signed,
    ]);
    const refresh = vi.fn<FetchLike>(async () => json({ batch, status: "ok" }));
    expect(
      await createReferralsApi(refresh).refreshBatch({ batchId: batch.id }),
    ).toMatchObject({ status: "ok" });
    expect(sent(refresh)).toEqual([
      referralBatchRoutes.refresh.path,
      "POST",
      { batchId: batch.id },
    ]);
  });
});
