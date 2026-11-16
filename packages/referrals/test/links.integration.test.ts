import { randomUUID } from "node:crypto";

import { referralLinks } from "@frostbite/database/schema/referrals";
import { releasedWallets } from "@frostbite/database/schema/wallet-release";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { linkNewAccount } from "../src/links.ts";
import type { NewAccountIdentity } from "../src/types.ts";
import {
  clock,
  database,
  referrals,
  registerDatabase,
  seedUser,
} from "./support/fixture.ts";

registerDatabase();

const contact: NewAccountIdentity = { kind: "contact" };
const wallet = (script: string): NewAccountIdentity => ({
  kind: "wallet",
  network: "signet",
  scriptIdentity: script,
});

const link = (
  code: string | null,
  referredUserId: string,
  identity: NewAccountIdentity = contact,
) =>
  database.transaction((transaction) =>
    linkNewAccount(transaction, { code, identity, referredUserId }),
  );
const linkOf = async (userId: string) =>
  (
    await database
      .select()
      .from(referralLinks)
      .where(eq(referralLinks.referredUserId, userId))
  )[0];

describe("linking a new account to who referred it", () => {
  it("makes the one link, with the code the person arrived with, whatever case or spacing it was typed in", async () => {
    const referrer = await seedUser();
    const code = await referrals.codes.ensure(referrer);
    const person = await seedUser();
    expect(await link(` ${code.toLowerCase()} `, person)).toEqual({
      kind: "linked",
      referrerId: referrer,
    });
    expect(await linkOf(person)).toMatchObject({
      code,
      referredUserId: person,
      referrerId: referrer,
    });
  });

  it.each([null, "", "nothing", "23456789"])(
    "makes no link, and no failure, for %j (no code, or one nobody holds)",
    async (code) => {
      const person = await seedUser();
      const outcome = await link(code, person);
      expect(outcome.kind).toBe("not-linked");
      expect(await linkOf(person)).toBeUndefined();
    },
  );

  it("says why it made none: no code, a code nobody holds", async () => {
    const person = await seedUser();
    expect(await link(null, person)).toEqual({
      kind: "not-linked",
      reason: "no-code",
    });
    expect(await link("23456789", person)).toEqual({
      kind: "not-linked",
      reason: "unknown-code",
    });
  });

  it("refuses a person's own code", async () => {
    const person = await seedUser();
    const code = await referrals.codes.ensure(person);
    expect(await link(code, person)).toEqual({
      kind: "not-linked",
      reason: "self",
    });
    expect(await linkOf(person)).toBeUndefined();
  });

  it("refuses a wallet the referrer's own account gave up, and accepts one another account gave up", async () => {
    const referrer = await seedUser();
    const code = await referrals.codes.ensure(referrer);
    const former = await seedUser();
    const mine = `script-${randomUUID()}`;
    const theirs = `script-${randomUUID()}`;
    for (const [script, owner] of [
      [mine, referrer],
      [theirs, former],
    ] as const)
      await database.insert(releasedWallets).values({
        heldUntil: new Date(clock.now.getTime() + 1_000),
        id: randomUUID(),
        network: "signet",
        previousUserId: owner,
        releasedAt: clock.now,
        scriptIdentity: script,
      });
    const first = await seedUser();
    expect(await link(code, first, wallet(mine))).toEqual({
      kind: "not-linked",
      reason: "shared-identity",
    });
    expect(await linkOf(first)).toBeUndefined();
    const second = await seedUser();
    expect((await link(code, second, wallet(theirs))).kind).toBe("linked");
  });

  it("is made with the account or not at all: a transaction that is undone leaves no link", async () => {
    const referrer = await seedUser();
    const code = await referrals.codes.ensure(referrer);
    const person = await seedUser();
    await expect(
      database.transaction(async (transaction) => {
        await linkNewAccount(transaction, {
          code,
          identity: contact,
          referredUserId: person,
        });
        throw new Error("the account was not made");
      }),
    ).rejects.toThrow("the account was not made");
    expect(await linkOf(person)).toBeUndefined();
  });
});

describe("what the database holds of a link", () => {
  it("gives an account one referrer, once: a second link is refused, and a link is never changed", async () => {
    const first = await seedUser();
    const second = await seedUser();
    const person = await seedUser();
    await link(await referrals.codes.ensure(first), person);
    await expect(
      link(await referrals.codes.ensure(second), person),
    ).rejects.toThrow();
    await expect(
      database
        .update(referralLinks)
        .set({ referrerId: second })
        .where(eq(referralLinks.referredUserId, person)),
    ).rejects.toThrow();
    expect((await linkOf(person))?.referrerId).toBe(first);
  });

  it("refuses a person referring themselves even written directly", async () => {
    const person = await seedUser();
    await expect(
      database.insert(referralLinks).values({
        code: "23456789",
        referredUserId: person,
        referrerId: person,
      }),
    ).rejects.toThrow();
  });
});
