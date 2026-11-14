import type { FetchLike } from "@frostbite/client-http";
import { referralAdminRoutes } from "@frostbite/shared/referrals";
import { describe, expect, it, vi } from "vitest";

import { createReferralsApi } from "../src/client/api.ts";

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
});
