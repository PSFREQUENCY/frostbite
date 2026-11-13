import { referralCodePattern } from "@frostbite/shared/referrals";
import { describe, expect, it } from "vitest";

import { createCodes, drawCode } from "../src/codes.ts";
import { database, registerDatabase, seedUser } from "./support/fixture.ts";

registerDatabase();

describe("a person's referral code", () => {
  it("is made the first time it is asked for, in the shape of a code, and is the same every time after", async () => {
    const codes = createCodes({ database });
    const user = await seedUser();
    const first = await codes.ensure(user);
    expect(first).toMatch(referralCodePattern);
    expect(await codes.ensure(user)).toBe(first);
  });

  it("is one code for a person asked at the same moment, and a different code for each person", async () => {
    const codes = createCodes({ database });
    const user = await seedUser();
    const other = await seedUser();
    const together = await Promise.all(
      Array.from({ length: 8 }, () => codes.ensure(user)),
    );
    expect(new Set(together).size).toBe(1);
    expect(await codes.ensure(other)).not.toBe(together[0]);
  });

  it("draws again when the code drawn is already someone's, and gives up with a plain error when it never finds a free one", async () => {
    const taken = await createCodes({ database }).ensure(await seedUser());
    const fresh = drawCode();
    const draws = [taken, taken, fresh];
    const retrying = createCodes({
      database,
      randomCode: () => draws.shift() ?? taken,
    });
    expect(await retrying.ensure(await seedUser())).toBe(fresh);
    expect(draws).toEqual([]);
    const stuck = createCodes({ database, randomCode: () => taken });
    await expect(stuck.ensure(await seedUser())).rejects.toThrow(
      "No free referral code",
    );
  });

  it("is found by its owner's lookup in any case and with spaces, and not at all for a text that is not a code", async () => {
    const codes = createCodes({ database });
    const user = await seedUser();
    const code = await codes.ensure(user);
    expect(await codes.ownerOf(code)).toBe(user);
    expect(await codes.ownerOf(` ${code.toLowerCase()} `)).toBe(user);
    expect(await codes.ownerOf("nothing")).toBeNull();
    expect(await codes.ownerOf("23456789")).toBeNull();
  });

  it("draws only characters of the alphabet", () => {
    for (let index = 0; index < 200; index += 1)
      expect(drawCode()).toMatch(referralCodePattern);
  });
});
