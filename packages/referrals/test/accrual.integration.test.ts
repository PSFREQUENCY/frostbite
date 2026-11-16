import { rewardEntries } from "@frostbite/database/schema/rewards";
import { desc, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { referralProgramKey, sourceKeyOfClaim } from "../src/kind.ts";
import {
  claimOf,
  clock,
  database,
  feeAsset,
  referrals,
  registerDatabase,
  seedUser,
  setProgram,
} from "./support/fixture.ts";

registerDatabase();

// A referrer and a person they brought, linked as the sign-in step links them.
async function referredPair() {
  const referrer = await seedUser();
  const person = await seedUser();
  const code = await referrals.codes.ensure(referrer);
  await database.transaction((transaction) =>
    referrals.linkNewAccount(transaction, {
      code,
      identity: { kind: "contact" },
      referredUserId: person,
    }),
  );
  return { person, referrer };
}

const entries = async (beneficiaryId: string) =>
  (await referrals.rewards.balances.entries(beneficiaryId, referralProgramKey))
    .items;
const balance = (beneficiaryId: string) =>
  referrals.rewards.balances.balance({
    assetKey: feeAsset,
    beneficiaryId,
    programKey: referralProgramKey,
  });

describe("a claim that took effect, for a person someone referred", () => {
  it("earns the referrer the rate of the platform fee, named by the claim, in the fee's asset, and nothing for the person who minted", async () => {
    const { person, referrer } = await referredPair();
    const setting = await setProgram(300);
    const claim = claimOf(person, 3_000n);
    expect(await referrals.accrual.claimCompleted(claim)).toEqual({
      accrued: 1,
      duplicates: 0,
      skipped: [],
    });
    expect(await entries(referrer)).toMatchObject([
      {
        amount: 90n,
        assetKey: feeAsset,
        beneficiaryId: referrer,
        kind: "accrual",
        programKey: referralProgramKey,
        sourceKey: sourceKeyOfClaim(claim.claimId),
      },
    ]);
    expect((await balance(referrer)).payable).toBe(90n);
    expect(await entries(person)).toEqual([]);
    expect(setting.params).toEqual({ rateBasisPoints: 300 });
  });

  it("earns once however many times the claim is told, so it may be told again after a failure", async () => {
    const { person, referrer } = await referredPair();
    await setProgram(300);
    const claim = claimOf(person, 3_000n);
    await referrals.accrual.claimCompleted(claim);
    expect(await referrals.accrual.claimCompleted(claim)).toEqual({
      accrued: 0,
      duplicates: 1,
      skipped: [],
    });
    await Promise.all([
      referrals.accrual.claimCompleted(claim),
      referrals.accrual.claimCompleted(claim),
    ]);
    expect(await entries(referrer)).toHaveLength(1);
    expect((await balance(referrer)).payable).toBe(90n);
  });

  it("earns for every claim the person makes, for as long as they keep minting (lifetime)", async () => {
    const { person, referrer } = await referredPair();
    await setProgram(300);
    for (let index = 0; index < 3; index += 1)
      await referrals.accrual.claimCompleted(claimOf(person, 3_000n));
    expect((await balance(referrer)).payable).toBe(270n);
    expect(await entries(referrer)).toHaveLength(3);
  });

  it("earns at the rate in force when the claim is told, and each earning names the setting it was earned under", async () => {
    const { person, referrer } = await referredPair();
    const first = await setProgram(300);
    await referrals.accrual.claimCompleted(claimOf(person, 10_000n));
    clock.now = new Date(clock.now.getTime() + 1_000);
    const second = await setProgram(500);
    await referrals.accrual.claimCompleted(claimOf(person, 10_000n));
    const found = await entries(referrer);
    expect(found.map(({ amount }) => amount)).toEqual([500n, 300n]);
    const settings = await database
      .select({ id: rewardEntries.settingId })
      .from(rewardEntries)
      .where(eq(rewardEntries.beneficiaryId, referrer))
      .orderBy(desc(rewardEntries.createdAt));
    expect(settings.map(({ id }) => id)).toEqual([second.id, first.id]);
  });
});

describe("a claim that earns nothing", () => {
  it("is one by a person nobody referred", async () => {
    const person = await seedUser();
    await setProgram(300);
    expect(
      await referrals.accrual.claimCompleted(claimOf(person, 3_000n)),
    ).toEqual({ accrued: 0, duplicates: 0, skipped: [] });
  });

  it("is one while the program is off, and the same claim told after it is switched on earns the cut then", async () => {
    const { person, referrer } = await referredPair();
    await setProgram(300, false);
    const claim = claimOf(person, 3_000n);
    await referrals.accrual.claimCompleted(claim);
    expect(await entries(referrer)).toEqual([]);
    clock.now = new Date(clock.now.getTime() + 1_000);
    await setProgram(300);
    await referrals.accrual.claimCompleted(claim);
    expect(await entries(referrer)).toHaveLength(1);
  });

  it("is one carrying no platform fee, or a fee so small the cut rounds to nothing", async () => {
    const { person, referrer } = await referredPair();
    await setProgram(300);
    await referrals.accrual.claimCompleted(claimOf(person, 0n));
    await referrals.accrual.claimCompleted(claimOf(person, 33n));
    expect(await entries(referrer)).toEqual([]);
  });

  it("is one while the referrer is frozen, and earns again from the next claim after they are unfrozen, never for the ones in between", async () => {
    const { person, referrer } = await referredPair();
    const staff = await seedUser();
    await setProgram(300);
    await referrals.freezes.set(staff, referrer, true, "farming");
    await referrals.accrual.claimCompleted(claimOf(person, 3_000n));
    expect(await entries(referrer)).toEqual([]);
    clock.now = new Date(clock.now.getTime() + 1_000);
    await referrals.freezes.set(staff, referrer, false, "cleared");
    await referrals.accrual.claimCompleted(claimOf(person, 3_000n));
    expect(await entries(referrer)).toHaveLength(1);
    expect((await balance(referrer)).payable).toBe(90n);
  });

  it("keeps what was earned before a freeze", async () => {
    const { person, referrer } = await referredPair();
    const staff = await seedUser();
    await setProgram(300);
    await referrals.accrual.claimCompleted(claimOf(person, 3_000n));
    await referrals.freezes.set(staff, referrer, true, "review");
    expect((await balance(referrer)).payable).toBe(90n);
  });
});
