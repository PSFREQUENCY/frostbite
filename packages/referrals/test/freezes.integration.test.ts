import { referralFreezes } from "@frostbite/database/schema/referrals";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  clock,
  database,
  referrals,
  registerDatabase,
  seedUser,
} from "./support/fixture.ts";

registerDatabase();

const advance = (seconds: number) => {
  clock.now = new Date(clock.now.getTime() + seconds * 1_000);
};

describe("freezing a referrer", () => {
  it("is off for a person never frozen, and follows the newest row, with the reason kept", async () => {
    const staff = await seedUser();
    const referrer = await seedUser();
    expect(await referrals.freezes.isFrozen(referrer)).toBe(false);
    await referrals.freezes.set(staff, referrer, true, " suspected farming ");
    expect(await referrals.freezes.isFrozen(referrer)).toBe(true);
    advance(1);
    await referrals.freezes.set(staff, referrer, false, "cleared");
    expect(await referrals.freezes.isFrozen(referrer)).toBe(false);
    const history = await referrals.freezes.history(referrer);
    expect(history.map(({ frozen, reason }) => [frozen, reason])).toEqual([
      [false, "cleared"],
      [true, "suspected farming"],
    ]);
    expect(history[0]).toMatchObject({
      changedBy: staff,
      referrerId: referrer,
    });
  });

  it("keeps only one person's freezes to them", async () => {
    const staff = await seedUser();
    const one = await seedUser();
    const other = await seedUser();
    await referrals.freezes.set(staff, one, true, "reason");
    expect(await referrals.freezes.isFrozen(other)).toBe(false);
    expect(await referrals.freezes.history(other)).toEqual([]);
  });

  it("needs a reason, of a sensible length, and writes nothing without one", async () => {
    const staff = await seedUser();
    const referrer = await seedUser();
    expect(await referrals.freezes.set(staff, referrer, true, "  ")).toEqual({
      code: "reason-required",
      ok: false,
    });
    expect(
      await referrals.freezes.set(staff, referrer, true, "x".repeat(501)),
    ).toEqual({ code: "reason-too-long", ok: false });
    expect(await referrals.freezes.history(referrer)).toEqual([]);
  });

  it("is never rewritten: the log refuses a change to an earlier row", async () => {
    const staff = await seedUser();
    const referrer = await seedUser();
    await referrals.freezes.set(staff, referrer, true, "reason");
    await expect(
      database
        .update(referralFreezes)
        .set({ frozen: false })
        .where(eq(referralFreezes.referrerId, referrer)),
    ).rejects.toThrow();
    expect(await referrals.freezes.isFrozen(referrer)).toBe(true);
  });

  it("limits how much history is read at once", async () => {
    const staff = await seedUser();
    const referrer = await seedUser();
    for (let index = 0; index < 3; index += 1) {
      advance(1);
      await referrals.freezes.set(staff, referrer, index % 2 === 0, "reason");
    }
    expect(await referrals.freezes.history(referrer, 2)).toHaveLength(2);
    expect(await referrals.freezes.history(referrer, 0)).toHaveLength(1);
  });
});
