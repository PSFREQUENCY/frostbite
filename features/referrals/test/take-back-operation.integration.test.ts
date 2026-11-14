import { randomUUID } from "node:crypto";

import { referralProgramKey } from "@frostbite/referrals";
import {
  referralAdministerCapability,
  takeBackRoute,
} from "@frostbite/shared/referrals";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { WalletProvider } from "@frostbite/wallet/client";
import { describe, expect, it } from "vitest";

import { createTakeBackOperation } from "../src/application/take-back-operation.ts";
import { createReferralsFeature } from "../src/registration.ts";
import { createReferralsResolver } from "../src/runtime.ts";
import { featureConfig } from "./support/config.ts";
import { navigationFor } from "./support/data.ts";
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
const takeBack = createTakeBackOperation(resolve);
const as = (actorUserId: string | null) => ({
  actorSession: null,
  actorUserId: actorUserId as never,
  correlationId: "c0ffee00-0000-4000-8000-000000000000" as never,
});
const wire = (value: unknown) => {
  const result = value as { ok: true; value: Record<string, unknown> };
  if (!result.ok) throw new Error("the operation turned the caller away");
  return result.value;
};

// A referrer with one earning that can be paid now.
async function earning() {
  const admin = await seedUser("Ada Admin");
  clock.now = new Date(clock.now.getTime() + 1_000);
  await reads.program.set(admin, {
    enabled: true,
    maturitySeconds: 0,
    minimumPayout: 0n,
    rateBasisPoints: 300,
  });
  const referrer = await seedUser("Rita Referrer");
  await earn(referrer, 10_000n, randomUUID());
  const [entry] = (
    await reads.rewards.balances.entries(referrer, referralProgramKey, {})
  ).items;
  if (entry === undefined) throw new Error("nothing was earned");
  return { admin, entry, referrer };
}

describe("the operation that takes an earning back", () => {
  it("is for administrators, a post of JSON on its route, and turns away a caller who is not signed in", async () => {
    expect(takeBack).toMatchObject({
      access: { capability: referralAdministerCapability, kind: "platform" },
      idempotency: "none",
      input: "json",
      ...takeBackRoute,
    });
    expect(
      await takeBack.execute(
        { earningId: randomUUID(), reason: "Why" },
        as(null),
      ),
    ).toMatchObject({ ok: false });
  });

  it("takes it back as the signed-in administrator, says what happened to the money, and shows on the referrer's page who did it and why", async () => {
    const { admin, entry, referrer } = await earning();
    expect(
      wire(
        await takeBack.execute(
          { earningId: entry.id, reason: "Wash trading" },
          as(admin),
        ),
      ),
    ).toEqual({ effect: "pot", status: "saved" });
    const detail = await reads.admin.referrer(referrer, {});
    const lines = detail?.earnings.items ?? [];
    expect(lines).toHaveLength(2);
    for (const line of lines)
      expect(line.takenBack).toMatchObject({
        by: "Ada Admin",
        reason: "Wash trading",
      });
  });

  it("answers why not when it was already taken back, when the reason is missing, and when there is no such earning", async () => {
    const { admin, entry } = await earning();
    await takeBack.execute({ earningId: entry.id, reason: "First" }, as(admin));
    expect(
      wire(
        await takeBack.execute(
          { earningId: entry.id, reason: "Again" },
          as(admin),
        ),
      ),
    ).toEqual({ reason: "already-taken-back", status: "refused" });
    expect(
      wire(
        await takeBack.execute(
          { earningId: randomUUID(), reason: "Why" },
          as(admin),
        ),
      ),
    ).toEqual({ reason: "not-found", status: "refused" });
    const other = await earning();
    expect(
      wire(
        await takeBack.execute(
          { earningId: other.entry.id, reason: "   " },
          as(other.admin),
        ),
      ),
    ).toEqual({ reason: "invalid-reason", status: "refused" });
    expect(
      wire(
        await takeBack.execute(
          { earningId: other.entry.id, reason: "x".repeat(501) },
          as(other.admin),
        ),
      ),
    ).toEqual({ reason: "invalid-reason", status: "refused" });
  });
});

describe("the referrer's page", () => {
  const render = async (referrerId: string, admin: boolean) => {
    const entrypoint = await createReferralsFeature(featureConfig()).load({
      registeredFeatureCount: 1,
      registeredFeatureIds: ["referrals"],
    });
    const page = entrypoint.pages?.find(
      ({ path }) => path === "/admin/referrals/referrers/[referrerId]",
    );
    if (page === undefined) throw new Error("no such page");
    return renderToStaticMarkup(
      createElement(WalletProvider, {
        children: await page.render({
          actorUserId: null,
          navigation: navigationFor(admin),
          params: { referrerId },
        } as never),
        network: "signet",
      }),
    );
  };

  it("offers to take an earning back to an administrator and not to staff, and shows one that was taken back with its reason", async () => {
    const { admin, entry, referrer } = await earning();
    expect(await render(referrer, true)).toContain("Take back");
    expect(await render(referrer, false)).not.toContain("Take back");
    await takeBack.execute(
      { earningId: entry.id, reason: "Wash trading" },
      as(admin),
    );
    const html = await render(referrer, true);
    expect(html).toContain("Taken back by Ada Admin");
    expect(html).toContain("Wash trading");
    expect(html).not.toContain("Take back</button>");
  });
});
