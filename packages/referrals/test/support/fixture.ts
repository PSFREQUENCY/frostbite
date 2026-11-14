import { randomUUID } from "node:crypto";

import {
  authUsers,
  createDatabaseClient,
  createDatabasePool,
  parseDatabaseEnvironment,
  rewardProgramSettings,
  runMigrations,
} from "@frostbite/database";
import { assetKeyOf } from "@frostbite/rewards";
import { chainRefSchema } from "@frostbite/shared/chain";
import { max } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach } from "vitest";

import { referralKindId, referralProgramKey } from "../../src/kind.ts";
import { createReferrals } from "../../src/service.ts";
import type { CompletedClaim } from "../../src/types.ts";

export const environment = parseDatabaseEnvironment(process.env);
export const pool = createDatabasePool(environment);
export const database = createDatabaseClient(pool);

export const chain = chainRefSchema.parse("simnet:one");
export const feeAsset = assetKeyOf({ chain, id: "sim", kind: "native" });

export const start = new Date("2026-11-13T12:00:00.000Z");
export const clock = { now: start };

export const policy = {
  maximumMaturitySeconds: 86_400 * 30,
  maximumMinimumPayout: 1_000_000n,
};

export const referrals = createReferrals({
  clock: () => clock.now,
  database,
  feeAssetKey: (onChain) =>
    onChain === chain
      ? feeAsset
      : assetKeyOf({ chain, id: "other", kind: "native" }),
  newId: randomUUID,
  policy,
});

export async function seedUser(): Promise<string> {
  const id = randomUUID();
  await database
    .insert(authUsers)
    .values({ email: `${id}@example.test`, id, name: "Player" });
  return id;
}

// Turns the referral program on (or off) at a rate in hundredths of a percent.
export async function setProgram(
  rateBasisPoints: number,
  enabled = true,
  maturitySeconds = 0,
) {
  const result = await referrals.rewards.programs.setProgram(
    null,
    referralProgramKey,
    {
      enabled,
      kind: referralKindId,
      maturitySeconds,
      minimumPayout: 0n,
      params: { rateBasisPoints },
    },
  );
  if (!result.ok) throw new Error(`Could not set the program: ${result.code}`);
  return result.setting;
}

let claimNumber = 0;
export function claimOf(
  userId: string,
  platformFee: bigint,
  id?: string,
): CompletedClaim {
  claimNumber += 1;
  return {
    chain,
    claimId: id ?? `claim-${String(claimNumber)}-${randomUUID().slice(0, 8)}`,
    completedAt: clock.now,
    gameId: "game-one",
    milestoneId: "first",
    platformFee,
    userId,
  };
}

// Every test starts a day after the newest setting in the database (shared by every file of the run) with the program off, so the setting
// a test makes is the newest and an earlier test's program earns nothing for this one.
export function registerDatabase(): void {
  beforeAll(async () => runMigrations(environment));
  beforeEach(async () => {
    const [newest] = await database
      .select({ at: max(rewardProgramSettings.createdAt) })
      .from(rewardProgramSettings);
    clock.now = new Date(
      Math.max(start.getTime(), newest?.at?.getTime() ?? 0) + 86_400_000,
    );
    await setProgram(1, false);
    clock.now = new Date(clock.now.getTime() + 1_000);
  });
  afterAll(async () => pool.end());
}
