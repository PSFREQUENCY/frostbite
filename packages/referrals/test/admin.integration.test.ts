import { describe, expect, it } from "vitest";

import { assetKeyOf } from "@frostbite/rewards";
import { chainRefSchema } from "@frostbite/shared/chain";

import { sourceKeyOfClaim } from "../src/kind.ts";
import type { ReferrersQuery } from "../src/referrers.ts";

import {
  claimOf,
  claimRow,
  clock,
  database,
  feeAsset,
  referredPair,
  referrals,
  registerDatabase,
  seedUser,
  setProgram,
} from "./support/fixture.ts";

registerDatabase();

const advance = (seconds: number) => {
  clock.now = new Date(clock.now.getTime() + seconds * 1_000);
};
const everyone: ReferrersQuery = {
  assetKey: feeAsset,
  filter: "all",
  page: 1,
  pageSize: 500,
  sort: "pot",
};
const mine = async (ids: readonly string[], query = everyone) =>
  (await referrals.admin.referrers(query)).rows.filter(({ referrerId }) =>
    ids.includes(referrerId),
  );

describe("the program in numbers", () => {
  it("counts referrers, referred, those who minted and frozen, and totals what is owed by asset from the kept balances", async () => {
    const before = await referrals.admin.overview();
    await setProgram(300, true, 3_600);
    const one = await referredPair();
    const two = await referredPair();
    await claimRow(one.person, "complete");
    await referrals.accrual.claimCompleted(claimOf(one.person, 3_000n));
    await referrals.accrual.claimCompleted(claimOf(two.person, 1_000n));
    const admin = await seedUser();
    await referrals.freezes.set(admin, two.referrer, true, "Under review.");
    const after = await referrals.admin.overview();
    expect(after.referrers - before.referrers).toBe(2);
    expect(after.referred - before.referred).toBe(2);
    expect(after.minted - before.minted).toBe(1);
    expect(after.frozen - before.frozen).toBe(1);
    const totals = (view: typeof after) =>
      view.assets.find(({ assetKey }) => assetKey === feeAsset);
    const grew = (key: "maturing" | "owed" | "paid" | "payable") =>
      (totals(after)?.[key] ?? 0n) - (totals(before)?.[key] ?? 0n);
    expect(grew("maturing")).toBe(120n);
    expect(grew("owed")).toBe(120n);
    expect(grew("payable")).toBe(0n);
    advance(3_601);
    const later = totals(await referrals.admin.overview());
    expect((later?.payable ?? 0n) - (totals(before)?.payable ?? 0n)).toBe(120n);
  });

  it("moves an earning from payable to in flight to paid as its payout does", async () => {
    const base = (await referrals.admin.overview()).assets.find(
      ({ assetKey }) => assetKey === feeAsset,
    );
    const { person, referrer } = await referredPair();
    await setProgram(300, true, 0);
    await referrals.accrual.claimCompleted(claimOf(person, 3_000n));
    const requested = await referrals.rewards.payouts.request({
      assetKey: feeAsset,
      beneficiaryId: referrer,
      destination: "sim:simnet:one:a1b2c3",
      programKey: "referral",
    });
    if (requested.kind !== "requested") throw new Error("not requested");
    const flight = (await referrals.admin.overview()).assets.find(
      ({ assetKey }) => assetKey === feeAsset,
    );
    expect((flight?.inFlight ?? 0n) - (base?.inFlight ?? 0n)).toBe(90n);
    expect((flight?.owed ?? 0n) - (base?.owed ?? 0n)).toBe(90n);
    await referrals.rewards.payouts.begin(requested.payout.id, {
      executor: "x",
    });
    await referrals.rewards.payouts.complete(requested.payout.id, {
      ref: "tx",
    });
    const paid = (await referrals.admin.overview()).assets.find(
      ({ assetKey }) => assetKey === feeAsset,
    );
    expect((paid?.paid ?? 0n) - (base?.paid ?? 0n)).toBe(90n);
    expect((paid?.owed ?? 0n) - (base?.owed ?? 0n)).toBe(0n);
  });
});

describe("the list of referrers", () => {
  it("sorts by pot, by how many they brought, and by the latest earning, and breaks no tie by chance", async () => {
    await setProgram(300, true, 0);
    const small = await referredPair();
    const big = await referredPair();
    const extra = await seedUser();
    await database.transaction((transaction) =>
      referrals.linkNewAccount(transaction, {
        code: big.code,
        identity: { kind: "contact" },
        referredUserId: extra,
      }),
    );
    await referrals.accrual.claimCompleted(claimOf(small.person, 1_000n));
    advance(5);
    await referrals.accrual.claimCompleted(claimOf(big.person, 9_000n));
    const ids = [small.referrer, big.referrer];
    expect((await mine(ids)).map(({ referrerId }) => referrerId)).toEqual([
      big.referrer,
      small.referrer,
    ]);
    const byReferred = await mine(ids, { ...everyone, sort: "referred" });
    expect(byReferred.map(({ referred }) => referred)).toEqual([2, 1]);
    const recent = await mine(ids, { ...everyone, sort: "recent" });
    expect(recent[0]?.referrerId).toBe(big.referrer);
    expect(recent[0]?.lastEarnedAt).toEqual(clock.now);
    expect(
      recent.find(({ referrerId }) => referrerId === small.referrer),
    ).toMatchObject({
      paid: 0n,
      unpaid: 30n,
    });
  });

  it("filters to those frozen and to those with something waiting", async () => {
    await setProgram(300, true, 0);
    const earning = await referredPair();
    const stopped = await referredPair();
    const idle = await referredPair();
    await referrals.accrual.claimCompleted(claimOf(earning.person, 3_000n));
    const admin = await seedUser();
    await referrals.freezes.set(admin, stopped.referrer, true, "Stopped.");
    const ids = [earning.referrer, stopped.referrer, idle.referrer];
    const frozen = await mine(ids, { ...everyone, filter: "frozen" });
    expect(frozen.map(({ referrerId }) => referrerId)).toEqual([
      stopped.referrer,
    ]);
    const waiting = await mine(ids, { ...everyone, filter: "waiting" });
    expect(waiting.map(({ referrerId }) => referrerId)).toEqual([
      earning.referrer,
    ]);
    expect(await mine(ids)).toHaveLength(3);
  });

  it("pages by count and says whether there is more, and shows no pot when no asset is chosen", async () => {
    await referredPair();
    await referredPair();
    const first = await referrals.admin.referrers({ ...everyone, pageSize: 1 });
    expect(first.rows).toHaveLength(1);
    expect(first.hasMore).toBe(true);
    const second = await referrals.admin.referrers({
      ...everyone,
      page: 2,
      pageSize: 1,
    });
    expect(second.rows[0]?.referrerId).not.toBe(first.rows[0]?.referrerId);
    const none = await referrals.admin.referrers({
      ...everyone,
      assetKey: null,
      pageSize: 500,
    });
    expect(none.rows.every(({ unpaid }) => unpaid === 0n)).toBe(true);
    expect(
      (await referrals.admin.referrers({ ...everyone, page: 0 })).rows,
    ).toEqual((await referrals.admin.referrers(everyone)).rows);
  });
});

describe("one referrer, whole", () => {
  it("shows the counts, the pot, the freezes with their reasons, the payouts, and each earning followed to its claim", async () => {
    const { code, person, referrer } = await referredPair();
    await setProgram(300, true, 0);
    const claimId = await claimRow(person, "complete");
    await referrals.accrual.claimCompleted({
      ...claimOf(person, 3_000n),
      claimId,
    });
    advance(1);
    await referrals.accrual.claimCompleted(claimOf(person, 1_000n));
    const admin = await seedUser();
    await referrals.freezes.set(admin, referrer, true, "Looked odd.");
    const detail = await referrals.admin.referrer(referrer);
    expect(detail).toMatchObject({
      code,
      frozen: true,
      minted: 1,
      name: "Player",
      referrerId: referrer,
      signedUp: 1,
    });
    expect(detail?.freezes).toMatchObject([
      { changedBy: admin, frozen: true, reason: "Looked odd." },
    ]);
    expect(detail?.pots[0]).toMatchObject({ payable: 120n });
    const [newer, older] = detail?.earnings.items ?? [];
    expect(newer?.claim).toBeNull();
    expect(older).toMatchObject({
      amount: 90n,
      claim: { claimId, gameId: "game-one", milestoneId: "first" },
      state: "payable",
    });
  });

  it("follows a reversal to no claim, and a pot in each asset the person has earned in, the larger first", async () => {
    const { person, referrer } = await referredPair();
    await setProgram(300, true, 0);
    const claim = claimOf(person, 3_000n);
    await referrals.accrual.claimCompleted(claim);
    advance(1);
    await referrals.rewards.accrual.reverse({
      programKey: "referral",
      sourceKey: sourceKeyOfClaim(claim.claimId),
    });
    const other = assetKeyOf({
      chain: chainRefSchema.parse("simnet:two"),
      id: "sim",
      kind: "native",
    });
    await referrals.rewards.accrual.accrue({
      id: `claim.completed:${claimOf(person, 1n).claimId}`,
      occurredAt: clock.now,
      payload: {
        asset: other,
        claimId: "other-asset-claim",
        fee: "10000",
        gameId: "game-one",
        milestoneId: "first",
        minter: person,
        referrer,
        referrerFrozen: false,
      },
      type: "claim.completed",
    });
    const detail = await referrals.admin.referrer(referrer);
    expect(detail?.earnings.items.map(({ state }) => state)).toEqual([
      "payable",
      "reversal",
      "payable",
    ]);
    expect(detail?.earnings.items[1]?.claim).toBeNull();
    expect(detail?.pots.map(({ assetKey }) => assetKey)).toEqual([
      other,
      feeAsset,
    ]);
    expect(detail?.pots[1]?.payable).toBe(0n);
  });

  it("is none for a person who is not there, and has no code for one who never opened the page", async () => {
    expect(await referrals.admin.referrer(crypto.randomUUID())).toBeNull();
    expect(await referrals.admin.referrer("")).toBeNull();
    expect(await referrals.admin.referrer("not-an-id")).toBeNull();
    const quiet = await seedUser();
    expect((await referrals.admin.referrer(quiet))?.code).toBeNull();
    expect(await referrals.codes.existing(quiet)).toBeNull();
  });
});
