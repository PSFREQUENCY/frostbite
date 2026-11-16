import { describe, expect, it } from "vitest";

import {
  clock,
  referrals,
  registerDatabase,
  seedUser,
} from "./support/fixture.ts";

registerDatabase();

describe("the referral program as one record", () => {
  it("reads as the newest setting, with the rate from its own settings, and keeps the log of who changed what", async () => {
    const admin = await seedUser();
    const first = await referrals.program.set(admin, {
      enabled: true,
      maturitySeconds: 3_600,
      minimumPayout: 10_000n,
      rateBasisPoints: 300,
    });
    clock.now = new Date(clock.now.getTime() + 1_000);
    const second = await referrals.program.set(admin, {
      enabled: false,
      maturitySeconds: 7_200,
      minimumPayout: 20_000n,
      rateBasisPoints: 250,
    });
    expect(first.ok && second.ok).toBe(true);
    expect(await referrals.program.current()).toMatchObject({
      changedBy: admin,
      enabled: false,
      maturitySeconds: 7_200,
      minimumPayout: 20_000n,
      rateBasisPoints: 250,
    });
    const history = await referrals.program.history(2);
    expect(history.map(({ rateBasisPoints }) => rateBasisPoints)).toEqual([
      250, 300,
    ]);
    expect(history[1]).toMatchObject({ changedBy: admin, enabled: true });
  });

  it("refuses a rate outside the kind's range and a number past the ceilings, and changes nothing", async () => {
    const admin = await seedUser();
    const before = await referrals.program.current();
    for (const rateBasisPoints of [0, 10_000]) {
      expect(
        await referrals.program.set(admin, {
          enabled: true,
          maturitySeconds: 0,
          minimumPayout: 0n,
          rateBasisPoints,
        }),
      ).toMatchObject({ code: "invalid-params", ok: false });
    }
    expect(
      await referrals.program.set(admin, {
        enabled: true,
        maturitySeconds: 0,
        minimumPayout: 1_000_001n,
        rateBasisPoints: 100,
      }),
    ).toMatchObject({ code: "above-maximum", ok: false });
    expect(await referrals.program.current()).toEqual(before);
  });
});
