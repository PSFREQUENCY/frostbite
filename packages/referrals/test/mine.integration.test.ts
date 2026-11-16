import { describe, expect, it } from "vitest";

import { referralProgramKey } from "../src/kind.ts";
import {
  claimOf,
  claimRow,
  clock,
  feeAsset,
  referredPair,
  referrals,
  registerDatabase,
  seedUser,
  setProgram,
} from "./support/fixture.ts";

registerDatabase();

const earn = async (person: string, fee = 3_000n) =>
  referrals.accrual.claimCompleted(claimOf(person, fee));
const advance = (seconds: number) => {
  clock.now = new Date(clock.now.getTime() + seconds * 1_000);
};
// What a person is shown, as text, to look for what must not be in it.
const shown = (value: object) =>
  JSON.stringify(value, (_key, part: unknown) =>
    typeof part === "bigint" ? part.toString() : part,
  );

describe("what a referrer sees of their own referrals", () => {
  it("is their code (the same each time), how many came and how many of those minted, and nothing about who", async () => {
    const { code, person, referrer } = await referredPair();
    const second = await seedUser();
    await referrals.codes.ensure(second);
    await claimRow(person, "complete");
    const summary = await referrals.mine.summary(referrer);
    expect(summary).toMatchObject({
      code,
      frozen: false,
      minted: 1,
      pots: [],
      signedUp: 1,
    });
    expect(await referrals.mine.summary(referrer)).toEqual(summary);
    expect(shown(summary)).not.toContain(person);
  });

  it("does not count a claim still on its way as a mint, and gives a stranger a code of their own and nothing else", async () => {
    const { person, referrer } = await referredPair();
    await claimRow(person, "signed");
    expect(await referrals.mine.summary(referrer)).toMatchObject({
      minted: 0,
      signedUp: 1,
    });
    const stranger = await seedUser();
    const view = await referrals.mine.summary(stranger);
    expect(view).toMatchObject({ minted: 0, pots: [], signedUp: 0 });
    expect(view.code).toBe(await referrals.codes.ensure(stranger));
  });

  it("says when earning is paused", async () => {
    const { referrer } = await referredPair();
    const admin = await seedUser();
    await referrals.freezes.set(admin, referrer, true, "Looked into it.");
    expect((await referrals.mine.summary(referrer)).frozen).toBe(true);
    advance(1);
    await referrals.freezes.set(admin, referrer, false, "All clear.");
    expect((await referrals.mine.summary(referrer)).frozen).toBe(false);
  });

  it("shows the pot as maturing, then payable once the delay has passed", async () => {
    const { person, referrer } = await referredPair();
    await setProgram(300, true, 3_600);
    await earn(person);
    expect((await referrals.mine.summary(referrer)).pots).toEqual([
      {
        assetKey: feeAsset,
        inFlight: 0n,
        maturing: 90n,
        paid: 0n,
        payable: 0n,
      },
    ]);
    advance(3_601);
    expect((await referrals.mine.summary(referrer)).pots[0]).toMatchObject({
      maturing: 0n,
      payable: 90n,
    });
  });

  it("lists earnings newest first with where each stands, and the payouts, without a word of who minted or what", async () => {
    const { person, referrer } = await referredPair();
    await setProgram(300, true, 3_600);
    await earn(person, 1_000n);
    advance(10);
    await earn(person, 2_000n);
    const first = await referrals.mine.history(referrer);
    expect(
      first.entries.items.map(({ amount, state }) => [amount, state]),
    ).toEqual([
      [60n, "maturing"],
      [30n, "maturing"],
    ]);
    expect(shown(first)).not.toContain(person);
    expect(shown(first)).not.toContain("claim");

    advance(3_700);
    const payable = await referrals.mine.history(referrer);
    expect(
      payable.entries.items.every(({ state }) => state === "payable"),
    ).toBe(true);

    const requested = await referrals.rewards.payouts.request({
      assetKey: feeAsset,
      beneficiaryId: referrer,
      destination: "sim:simnet:one:a1b2c3",
      programKey: referralProgramKey,
    });
    if (requested.kind !== "requested") throw new Error("not requested");
    const inPayout = await referrals.mine.history(referrer);
    expect(
      inPayout.entries.items.every(({ state }) => state === "in-payout"),
    ).toBe(true);
    expect(inPayout.payouts).toMatchObject([
      { amount: 90n, assetKey: feeAsset, state: "requested" },
    ]);

    await referrals.rewards.payouts.begin(requested.payout.id, {
      executor: "x",
    });
    await referrals.rewards.payouts.complete(requested.payout.id, {
      ref: "tx",
    });
    const done = await referrals.mine.history(referrer);
    expect(done.entries.items.every(({ state }) => state === "paid")).toBe(
      true,
    );
    expect(done.payouts[0]?.state).toBe("complete");
    expect((await referrals.mine.summary(referrer)).pots[0]).toMatchObject({
      paid: 90n,
      payable: 0n,
    });
  });

  it("shows a reversal as its own row, pages by cursor and keeps the payouts to the first page", async () => {
    const { person, referrer } = await referredPair();
    await setProgram(300, true, 0);
    const claim = claimOf(person, 3_000n);
    await referrals.accrual.claimCompleted(claim);
    advance(1);
    await referrals.rewards.accrual.reverse({
      programKey: referralProgramKey,
      sourceKey: `claim.completed:${claim.claimId}`,
    });
    advance(1);
    await earn(person, 1_000n);
    const page = await referrals.mine.history(referrer, { limit: 2 });
    expect(page.entries.items.map(({ state }) => state)).toEqual([
      "payable",
      "reversal",
    ]);
    expect(page.entries.next).not.toBeNull();
    const next = await referrals.mine.history(referrer, {
      after: page.entries.next,
      limit: 2,
    });
    expect(next.entries.items.map(({ amount }) => amount)).toEqual([90n]);
    expect(next.entries.next).toBeNull();
    expect(next.payouts).toEqual([]);
  });
});
