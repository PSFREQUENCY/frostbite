import { randomUUID } from "node:crypto";

import { walletIdentities } from "@frostbite/database";
import {
  referralAdministerCapability,
  referralAdminRoutes,
  referralPayoutRoute,
} from "@frostbite/shared/referrals";
import { describe, expect, it } from "vitest";

import {
  createRequestPayoutOperation,
  createSetFrozenOperation,
  createSetProgramOperation,
} from "../src/application/operations.ts";
import {
  clock,
  database,
  earn,
  payouts,
  policy,
  reads,
  registerDatabase,
  seedUser,
} from "./support/database.ts";

registerDatabase();

const resolve = async () => ({
  ...reads,
  payouts,
  names: async () => new Map<string, string>(),
});
const as = (actorUserId: string | null) => ({
  actorSession: null,
  actorUserId: actorUserId as never,
  correlationId: "c0ffee00-0000-4000-8000-000000000000" as never,
});
const setProgram = createSetProgramOperation(resolve);
const setFrozen = createSetFrozenOperation(resolve);
const requestPayout = createRequestPayoutOperation(resolve);
const input = {
  enabled: true,
  maturitySeconds: 3_600,
  minimumPayoutUnits: "10000",
  rateBasisPoints: 300,
};

describe("the operations that change the program", () => {
  it("need the administration capability, are posts of JSON on their routes, and are not cached", () => {
    for (const [operation, route] of [
      [setProgram, referralAdminRoutes.setProgram],
      [setFrozen, referralAdminRoutes.setFrozen],
    ] as const)
      expect(operation).toMatchObject({
        access: { capability: referralAdministerCapability, kind: "platform" },
        idempotency: "none",
        input: "json",
        ...route,
      });
  });

  it("turn away a caller who is not signed in, changing nothing", async () => {
    const before = await reads.program.current();
    expect(await setProgram.execute(input, as(null))).toMatchObject({
      ok: false,
    });
    expect(
      await setFrozen.execute(
        { frozen: true, reason: "x", referrerId: randomUUID() },
        as(null),
      ),
    ).toMatchObject({ ok: false });
    expect(await reads.program.current()).toEqual(before);
  });
});

describe("setting the program", () => {
  it("adds one row as the signed-in administrator, with every setting, and the next look at the record shows it", async () => {
    const admin = await seedUser();
    clock.now = new Date(clock.now.getTime() + 1_000);
    expect(await setProgram.execute(input, as(admin))).toEqual({
      ok: true,
      value: { status: "saved" },
    });
    expect(await reads.program.current()).toMatchObject({
      changedBy: admin,
      enabled: true,
      maturitySeconds: 3_600,
      minimumPayout: 10_000n,
      rateBasisPoints: 300,
    });
  });

  it("refuses a wait or a minimum past the ceilings and a rate outside the kind's range, saying which, and keeps what was in force", async () => {
    const admin = await seedUser();
    clock.now = new Date(clock.now.getTime() + 1_000);
    await setProgram.execute(input, as(admin));
    const before = await reads.program.current();
    expect(
      await setProgram.execute(
        { ...input, maturitySeconds: policy.maximumMaturitySeconds + 1 },
        as(admin),
      ),
    ).toEqual({
      ok: true,
      value: { reason: "above-maximum", status: "refused" },
    });
    expect(
      await setProgram.execute(
        { ...input, minimumPayoutUnits: "10000001" },
        as(admin),
      ),
    ).toEqual({
      ok: true,
      value: { reason: "above-maximum", status: "refused" },
    });
    expect(
      await setProgram.execute({ ...input, rateBasisPoints: 0 }, as(admin)),
    ).toEqual({
      ok: true,
      value: { reason: "invalid-rate", status: "refused" },
    });
    expect(await reads.program.current()).toEqual(before);
  });
});

describe("pausing and resuming a referrer", () => {
  const person = async () => {
    const referrer = await seedUser();
    const referred = await seedUser();
    const code = await reads.codes.ensure(referrer);
    expect(code).toHaveLength(8);
    expect(referred).not.toBe(referrer);
    return referrer;
  };

  it("keeps the reason and who did it, pausing and resuming as asked", async () => {
    const admin = await seedUser();
    const referrer = await person();
    expect(
      await setFrozen.execute(
        { frozen: true, reason: "Looks like farming.", referrerId: referrer },
        as(admin),
      ),
    ).toEqual({ ok: true, value: { frozen: true, status: "saved" } });
    expect(await reads.freezes.isFrozen(referrer)).toBe(true);
    clock.now = new Date(clock.now.getTime() + 1_000);
    expect(
      await setFrozen.execute(
        { frozen: false, reason: "Cleared.", referrerId: referrer },
        as(admin),
      ),
    ).toEqual({ ok: true, value: { frozen: false, status: "saved" } });
    expect(await reads.freezes.isFrozen(referrer)).toBe(false);
    expect(
      (await reads.freezes.history(referrer)).map(({ changedBy, reason }) => [
        changedBy,
        reason,
      ]),
    ).toEqual([
      [admin, "Cleared."],
      [admin, "Looks like farming."],
    ]);
  });

  it("says there is no such person for an id nobody has, and refuses a reason the ledger would refuse", async () => {
    const admin = await seedUser();
    expect(
      await setFrozen.execute(
        { frozen: true, reason: "x", referrerId: randomUUID() },
        as(admin),
      ),
    ).toEqual({ ok: true, value: { reason: "not-found", status: "refused" } });
    const referrer = await person();
    expect(
      await setFrozen.execute(
        { frozen: true, reason: "   ", referrerId: referrer },
        as(admin),
      ),
    ).toEqual({
      ok: true,
      value: { reason: "invalid-reason", status: "refused" },
    });
    expect(await reads.freezes.isFrozen(referrer)).toBe(false);
  });
});

describe("asking to be paid", () => {
  it("is for anyone signed in, a post of JSON on its route, and turns away a caller who is not signed in", async () => {
    expect(requestPayout).toMatchObject({
      access: { kind: "authenticated" },
      idempotency: "none",
      input: "json",
      ...referralPayoutRoute,
    });
    expect(
      await requestPayout.execute(
        { assetKey: "a/native/b", destination: "x" },
        as(null),
      ),
    ).toMatchObject({ ok: false });
  });

  it("takes what is payable as the signed-in person, to a wallet of theirs, and says the amount; and says why when it cannot", async () => {
    const admin = await seedUser();
    clock.now = new Date(clock.now.getTime() + 1_000);
    await reads.program.set(admin, {
      enabled: true,
      maturitySeconds: 0,
      minimumPayout: 0n,
      rateBasisPoints: 300,
    });
    const referrer = await seedUser();
    await database.insert(walletIdentities).values({
      address: "tb1qpayee",
      id: randomUUID(),
      network: "signet",
      scriptIdentity: randomUUID(),
      userId: referrer,
      walletAdapter: "unisat",
    });
    await earn(referrer, 5_000n, randomUUID());
    const assetKey = "simnet:one/native/sim";
    expect(
      await requestPayout.execute(
        { assetKey, destination: "tb1qother" },
        as(referrer),
      ),
    ).toEqual({
      ok: true,
      value: { reason: "not-your-wallet", status: "refused" },
    });
    expect(
      await requestPayout.execute(
        { assetKey, destination: "tb1qpayee" },
        as(referrer),
      ),
    ).toEqual({
      ok: true,
      value: { amountUnits: "150", status: "requested" },
    });
    expect(
      await requestPayout.execute(
        { assetKey, destination: "tb1qpayee" },
        as(referrer),
      ),
    ).toEqual({
      ok: true,
      value: { reason: "already-open", status: "refused" },
    });
  });

  it("gives the figures when the pot is under what the network would relay", async () => {
    const referrer = await seedUser();
    await database.insert(walletIdentities).values({
      address: "tb1qsmall",
      id: randomUUID(),
      network: "signet",
      scriptIdentity: randomUUID(),
      userId: referrer,
      walletAdapter: "unisat",
    });
    expect(
      await requestPayout.execute(
        { assetKey: "simnet:one/native/sim", destination: "tb1qsmall" },
        as(referrer),
      ),
    ).toEqual({
      ok: true,
      value: {
        minimumUnits: "100",
        payableUnits: "0",
        reason: "below-dust",
        status: "refused",
      },
    });
  });
});
