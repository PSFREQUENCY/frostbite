import { randomUUID } from "node:crypto";

import {
  authUsers,
  createDatabaseClient,
  createDatabasePool,
  parseDatabaseEnvironment,
  rewardProgramSettings,
  runMigrations,
} from "@frostbite/database";
import { createPayoutClaims, createReferralReads } from "@frostbite/referrals";
import { max } from "drizzle-orm";
import { afterAll, beforeAll } from "vitest";

import { feeAsset, policy } from "./data.ts";

// The feature against real PostgreSQL: one pool for the test's own rows, and the same reads the feature makes, to put the program and the
// earnings there that its pages then show.
export const environment = parseDatabaseEnvironment(process.env);
export const pool = createDatabasePool(environment);
export const database = createDatabaseClient(pool);

// A day ago, so what is earned now can be paid now (the pages read the real clock). Each file starts after the newest setting any file made
// (the database lasts for the whole run), so the setting a test makes is always the newest.
const aDayAgo = () => new Date(Date.now() - 86_400_000);
export { policy };
export const clock = { now: aDayAgo() };
export const reads = createReferralReads({
  clock: () => clock.now,
  database,
  newId: randomUUID,
  policy,
});

export function registerDatabase(): void {
  beforeAll(async () => {
    await runMigrations(environment);
    const [newest] = await database
      .select({ at: max(rewardProgramSettings.createdAt) })
      .from(rewardProgramSettings);
    clock.now = new Date(
      Math.max(aDayAgo().getTime(), (newest?.at?.getTime() ?? 0) + 1_000),
    );
  });
  afterAll(async () => pool.end());
}

export async function seedUser(name = "Player"): Promise<string> {
  const id = randomUUID();
  await database
    .insert(authUsers)
    .values({ email: `${id}@example.test`, id, name });
  return id;
}

// One earning for a referrer, as a claim of someone they brought would make it: the event the kind reads, told to the ledger.
export async function earn(referrer: string, fee: bigint, claimId: string) {
  return reads.rewards.accrual.accrue({
    id: `claim.completed:${claimId}`,
    occurredAt: clock.now,
    payload: {
      asset: feeAsset,
      claimId,
      fee: fee.toString(),
      gameId: "game-one",
      milestoneId: "first",
      minter: randomUUID(),
      referrer,
      referrerFrozen: false,
    },
    type: "claim.completed",
  });
}

// Paying to an address the test says is fine (the chain's own rules are the platform's, tested where the codec is).
export const payouts = createPayoutClaims({
  check: async (_asset, address) => ({
    address,
    minimumOutput: 100n,
    ok: true,
  }),
  database,
  rewards: reads.rewards,
});
