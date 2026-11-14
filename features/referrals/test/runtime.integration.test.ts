import { randomUUID } from "node:crypto";

import { walletIdentities } from "@frostbite/database";
import { describe, expect, it } from "vitest";

import { createReferralsResolver } from "../src/runtime.ts";
import { addressOf, featureConfig, servedChain } from "./support/config.ts";
import {
  clock,
  database,
  earn,
  reads,
  registerDatabase,
  seedUser,
} from "./support/database.ts";

registerDatabase();

const asset = `${servedChain}/native/sim`;
const resolve = createReferralsResolver(
  featureConfig(),
  process.env,
  () => clock.now,
);

async function referrerWith(...addresses: string[]) {
  const referrer = await seedUser();
  for (const address of addresses)
    await database.insert(walletIdentities).values({
      address,
      id: randomUUID(),
      network: "signet",
      scriptIdentity: `${address}-${randomUUID()}`,
      userId: referrer,
      walletAdapter: "unisat",
    });
  return referrer;
}

describe("where a payout may go, as the platform's chains say", () => {
  it("is the address as the chain writes it, when the chain accepts it and the pot reaches what it relays", async () => {
    const admin = await seedUser();
    clock.now = new Date(clock.now.getTime() + 1_000);
    await reads.program.set(admin, {
      enabled: true,
      maturitySeconds: 0,
      minimumPayout: 0n,
      rateBasisPoints: 300,
    });
    const good = addressOf("0a0b0c");
    const referrer = await referrerWith(good);
    await earn(referrer, 5_000n, randomUUID());
    const { payouts } = await resolve();
    expect(
      await payouts.claim({
        assetKey: asset,
        destination: good,
        userId: referrer,
      }),
    ).toMatchObject({
      kind: "requested",
      payout: { destination: good },
    });
  });

  it("is refused for an address the chain does not accept, one it cannot check, and a chain the platform does not serve", async () => {
    const referrer = await referrerWith("bad-one", "down-one", "other");
    const { payouts } = await resolve();
    const ask = (assetKey: string, destination: string) =>
      payouts.claim({ assetKey, destination, userId: referrer });
    expect(await ask(asset, "bad-one")).toEqual({
      kind: "invalid-destination",
    });
    expect(await ask(asset, "down-one")).toEqual({
      kind: "chain-unavailable",
    });
    expect(await ask("simnet:elsewhere/native/sim", "other")).toEqual({
      kind: "chain-unavailable",
    });
  });
});
