import { randomUUID } from "node:crypto";

import { walletIdentities } from "@frostbite/database";
import { describe, expect, it } from "vitest";

import {
  createPayoutClaims,
  type DestinationCheck,
} from "../src/payout-claims.ts";
import {
  claimOf,
  clock,
  database,
  feeAsset,
  referredPair,
  referrals,
  registerDatabase,
  setProgram,
} from "./support/fixture.ts";

registerDatabase();

const address = "sim:simnet:one:payee";
let dust = 100n;
const check: DestinationCheck = async (_asset, given) =>
  given.startsWith("bad")
    ? { ok: false, reason: "invalid" }
    : given.startsWith("down")
      ? { ok: false, reason: "chain-unavailable" }
      : { address: given.toUpperCase(), minimumOutput: dust, ok: true };
const claims = createPayoutClaims({
  check,
  database,
  rewards: referrals.rewards,
});

async function withWallet(userId: string, where = address) {
  await database.insert(walletIdentities).values({
    address: where,
    id: randomUUID(),
    network: "signet",
    scriptIdentity: `${where}-${randomUUID()}`,
    userId,
    walletAdapter: "unisat",
  });
}
const earn = (person: string, fee: bigint) =>
  referrals.accrual.claimCompleted(claimOf(person, fee));
const ask = (userId: string, destination = address) =>
  claims.claim({ assetKey: feeAsset, destination, userId });

describe("a referrer asking to be paid", () => {
  it("is paid what is payable, all of it, to a wallet of their own account written as the chain writes it, and the payout waits for a batch", async () => {
    const { person, referrer } = await referredPair();
    await withWallet(referrer);
    await setProgram(300, true, 0);
    await earn(person, 5_000n);
    clock.now = new Date(clock.now.getTime() + 1_000);
    const result = await ask(referrer);
    expect(result).toMatchObject({
      kind: "requested",
      payout: {
        amount: 150n,
        beneficiaryId: referrer,
        destination: address.toUpperCase(),
        state: "requested",
      },
    });
    expect((await claims.open(referrer)).map(({ state }) => state)).toEqual([
      "requested",
    ]);
    expect(
      (
        await referrals.rewards.balances.balance({
          assetKey: feeAsset,
          beneficiaryId: referrer,
          programKey: "referral",
        })
      ).payable,
    ).toBe(0n);
  });

  it("is turned away for a wallet that is not on their account, and is never offered another person's", async () => {
    const { person, referrer } = await referredPair();
    const stranger = await referredPair();
    await withWallet(stranger.referrer, "sim:simnet:one:theirs");
    await setProgram(300, true, 0);
    await earn(person, 5_000n);
    expect(await claims.wallets(referrer)).toEqual([]);
    expect(await ask(referrer, "sim:simnet:one:theirs")).toEqual({
      kind: "not-your-wallet",
    });
    expect(await claims.open(referrer)).toEqual([]);
  });

  it("says when the chain refuses the address or cannot be asked, and takes nothing out of the pot", async () => {
    const { person, referrer } = await referredPair();
    await withWallet(referrer, "bad-address");
    await withWallet(referrer, "down-address");
    await setProgram(300, true, 0);
    await earn(person, 5_000n);
    expect(await ask(referrer, "bad-address")).toEqual({
      kind: "invalid-destination",
    });
    expect(await ask(referrer, "down-address")).toEqual({
      kind: "chain-unavailable",
    });
    expect(await claims.open(referrer)).toEqual([]);
  });

  it("is refused under the program's minimum, and under what the network would relay, each saying the figures", async () => {
    const { person, referrer } = await referredPair();
    await withWallet(referrer);
    await referrals.rewards.programs.setProgram(null, "referral", {
      enabled: true,
      kind: "referral-cut",
      maturitySeconds: 0,
      minimumPayout: 1_000n,
      params: { rateBasisPoints: 300 },
    });
    clock.now = new Date(clock.now.getTime() + 1_000);
    await earn(person, 5_000n);
    expect(await ask(referrer)).toEqual({
      kind: "below-minimum",
      minimum: 1_000n,
      payable: 150n,
    });
    dust = 546n;
    try {
      expect(await ask(referrer)).toEqual({
        kind: "below-dust",
        minimum: 546n,
        payable: 150n,
      });
    } finally {
      dust = 100n;
    }
    expect(await claims.open(referrer)).toEqual([]);
  });

  it("makes one payout at a time, and says there is one when asked again", async () => {
    const { person, referrer } = await referredPair();
    await withWallet(referrer);
    await setProgram(300, true, 0);
    await earn(person, 5_000n);
    const first = await ask(referrer);
    if (first.kind !== "requested") throw new Error("not requested");
    expect(await ask(referrer)).toMatchObject({
      kind: "already-open",
      payout: { id: first.payout.id },
    });
  });

  it("is refused for an empty pot, and for a program nobody has set", async () => {
    const { referrer } = await referredPair();
    await withWallet(referrer);
    await setProgram(300, true, 0);
    expect(await ask(referrer)).toMatchObject({ kind: "below-dust" });
    const noProgram = createPayoutClaims({
      check,
      database,
      rewards: {
        ...referrals.rewards,
        programs: {
          ...referrals.rewards.programs,
          inForce: async () => null,
        },
      },
    });
    expect(
      await noProgram.claim({
        assetKey: feeAsset,
        destination: address,
        userId: referrer,
      }),
    ).toEqual({ kind: "program-not-set" });
  });
});
