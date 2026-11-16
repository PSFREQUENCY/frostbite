import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { referralProgramKey } from "../src/kind.ts";
import {
  claimOf,
  feeAsset,
  referredPair,
  referrals,
  registerDatabase,
  seedUser,
  setProgram,
} from "./support/fixture.ts";

registerDatabase();

// A referrer who earned 3% of `fee` (the program pays at once), and the entry of that earning.
async function earned(fee: bigint) {
  const { person, referrer } = await referredPair();
  await setProgram(300, true, 0);
  await referrals.accrual.claimCompleted(claimOf(person, fee));
  const { items } = await referrals.rewards.balances.entries(
    referrer,
    referralProgramKey,
    {},
  );
  const [entry] = items;
  if (entry === undefined) throw new Error("nothing was earned");
  return { entry, person, referrer };
}
const pot = async (referrer: string) =>
  (
    await referrals.rewards.balances.balance({
      assetKey: feeAsset,
      beneficiaryId: referrer,
      programKey: referralProgramKey,
    })
  ).payable;
const askToBePaid = async (referrer: string) => {
  const asked = await referrals.rewards.payouts.request({
    assetKey: feeAsset,
    beneficiaryId: referrer,
    destination: "sim:simnet:one:a1b2c3",
    programKey: referralProgramKey,
  });
  if (asked.kind !== "requested") throw new Error(asked.kind);
  return asked.payout;
};

describe("taking an earning back", () => {
  it("removes an earning that was not in a payout from the pot, says who did it and why, and says nothing is owed back", async () => {
    const admin = await seedUser();
    const { entry, referrer } = await earned(10_000n);
    expect(await pot(referrer)).toBe(300n);
    expect(
      await referrals.reversals.takeBack(admin, entry.id, "  Wash trading  "),
    ).toEqual({ effect: "pot", ok: true });
    expect(await pot(referrer)).toBe(0n);
    const said = (await referrals.reversals.takenBack([entry.id])).get(
      entry.id,
    );
    expect(said).toMatchObject({ reason: "Wash trading" });
    expect(said?.by).toBeTruthy();
    // The reversal entry is found by the same answer, so a page can say it on either row.
    const after = await referrals.rewards.balances.entries(
      referrer,
      referralProgramKey,
      {},
    );
    const reversal = after.items.find(({ kind }) => kind === "reversal");
    expect(
      (await referrals.reversals.takenBack([reversal?.id ?? ""])).get(
        reversal?.id ?? "",
      ),
    ).toMatchObject({ reason: "Wash trading" });
  });

  it("does it once: the second time is refused and changes nothing", async () => {
    const admin = await seedUser();
    const { entry, referrer } = await earned(10_000n);
    await referrals.reversals.takeBack(admin, entry.id, "First");
    expect(
      await referrals.reversals.takeBack(admin, entry.id, "Second"),
    ).toEqual({ code: "already-taken-back", ok: false });
    expect(await pot(referrer)).toBe(0n);
    expect(
      (await referrals.reversals.takenBack([entry.id])).get(entry.id)?.reason,
    ).toBe("First");
  });

  it("refuses without a reason or with one that is too long, an id that is nothing, and an entry that is a reversal, writing nothing", async () => {
    const admin = await seedUser();
    const { entry, referrer } = await earned(10_000n);
    expect(await referrals.reversals.takeBack(admin, entry.id, "   ")).toEqual({
      code: "reason-required",
      ok: false,
    });
    expect(
      await referrals.reversals.takeBack(admin, entry.id, "x".repeat(501)),
    ).toEqual({ code: "reason-too-long", ok: false });
    expect(
      await referrals.reversals.takeBack(admin, randomUUID(), "Why"),
    ).toEqual({ code: "not-found", ok: false });
    expect(
      await referrals.reversals.takeBack(admin, "not-an-id", "Why"),
    ).toEqual({ code: "not-found", ok: false });
    expect(await pot(referrer)).toBe(300n);
    await referrals.reversals.takeBack(admin, entry.id, "Why");
    const reversal = (
      await referrals.rewards.balances.entries(referrer, referralProgramKey, {})
    ).items.find(({ kind }) => kind === "reversal");
    expect(
      await referrals.reversals.takeBack(admin, reversal?.id ?? "", "Why"),
    ).toEqual({ code: "not-found", ok: false });
  });

  it("says an earning in a payout that has not finished will still go out, and holds the same amount back from what they earn next", async () => {
    const admin = await seedUser();
    const { entry, referrer } = await earned(10_000n);
    await askToBePaid(referrer);
    expect(await referrals.reversals.takeBack(admin, entry.id, "Why")).toEqual({
      effect: "pending-payout",
      ok: true,
    });
    expect(await pot(referrer)).toBe(-300n);
  });

  it("says a paid earning cannot be taken from the wallet, and the amount is held back from what they earn next until it is paid off", async () => {
    const admin = await seedUser();
    const { entry, person, referrer } = await earned(10_000n);
    const payout = await askToBePaid(referrer);
    await referrals.rewards.payouts.begin(payout.id, {
      actorId: admin,
      executor: "staff-batch",
    });
    await referrals.rewards.payouts.complete(payout.id, {
      actorId: admin,
      ref: "tx1",
    });
    expect(await referrals.reversals.takeBack(admin, entry.id, "Why")).toEqual({
      effect: "paid",
      ok: true,
    });
    expect(await pot(referrer)).toBe(-300n);
    // They earn again from the same person: the debt is paid off first, so only what is over is theirs (3% of 50,000 is 1,500; less 300).
    await referrals.accrual.claimCompleted(claimOf(person, 50_000n));
    expect(await pot(referrer)).toBe(1_200n);
  });
});
