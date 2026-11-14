import { createHash, randomUUID } from "node:crypto";

import { createDrizzleContactCodeRepository } from "@frostbite/auth";
import { gameMilestoneUnlocks, platformFeeSettings } from "@frostbite/database";
import { linkReferralOnNewAccount } from "@frostbite/feature-accounts/referral-link";
import { createReferrals, referralProgramKey } from "@frostbite/referrals";
import { simulatedAddress } from "@frostbite/test-kit/simulated-chain-address";
import { createUuidV7 } from "@frostbite/shared/identifiers";
import { afterAll, describe, expect, it } from "vitest";

import {
  chain,
  database,
  gameId,
  input,
  operations,
  pool,
  registerClaimsWorld,
  sessionFor,
  sign,
  world,
} from "./support/claims-world.ts";
import { feeAsset, testReferrals } from "./support/referrals-config.ts";

// What a claim earns the person who brought the player, from the invitation to the ledger: the referrer's code, the player signing in with
// it (which makes their account and the link in one transaction), the milestone earned and claimed through the operations the page uses,
// and the cut in the referrer's pot, once.
registerClaimsWorld();

// The ledger refuses to lose an entry and holds on to the accounts behind it, so another file of this package that empties the accounts would
// be refused. Truncating is the one way a test may put the ledger back (it is not a row deleted); this file does it when it is done.
afterAll(async () => {
  await pool.query(
    'truncate "frostbite"."referral_payout_batch_items", "frostbite"."referral_payout_batches", "frostbite"."reward_entries", "frostbite"."reward_balances", "frostbite"."reward_payout_transitions", "frostbite"."reward_payouts", "frostbite"."reward_program_settings"',
  );
});

const referrals = createReferrals({
  ...testReferrals,
  clock: () => world.now,
  database,
  feeAssetKey: () => feeAsset,
  newId: randomUUID,
});
const sessionMaterial = () => ({
  absoluteExpiresAt: new Date(world.now.getTime() + 3_600_000),
  authenticatedAt: world.now,
  idleExpiresAt: new Date(world.now.getTime() + 600_000),
  tokenHash: createHash("sha256").update(randomUUID()).digest("hex"),
});

// A person who signs in by email with a referral code, as the sign-in step does: it makes their account and, in that transaction, the link.
async function signInWith(referralCode: string | null, address: string) {
  const repository = createDrizzleContactCodeRepository(database, {
    onAccountCreated: linkReferralOnNewAccount,
  });
  const codeId = createUuidV7();
  await repository.issue({
    codeHash: "a".repeat(64),
    destination: address,
    expiresAt: new Date(world.now.getTime() + 600_000),
    id: codeId,
    issuedAt: world.now,
    kind: "email",
    limits: { cooldownMs: 0, maximumPerWindow: 10, windowMs: 3_600_000 },
    purpose: "sign-in",
    salt: "salt",
    userId: null,
  });
  const result = await repository.completeSignIn({
    accountName: "Email user",
    codeId,
    destination: address,
    kind: "email",
    now: world.now,
    referralCode,
    session: sessionMaterial(),
  });
  if (result.kind !== "signed-in") throw new Error("not signed in");
  return result.userId;
}

async function setUp(feeSats: bigint, rateBasisPoints = 300) {
  await database.insert(platformFeeSettings).values({
    chain,
    feeSats,
    id: randomUUID(),
    treasuryAddress: simulatedAddress(chain, "7ea5a1").value,
  });
  const referrer = await signInWith(null, `${randomUUID()}@example.test`);
  const code = await referrals.codes.ensure(referrer);
  const player = await signInWith(code, `${randomUUID()}@example.test`);
  await database.insert(gameMilestoneUnlocks).values({
    count: 1,
    gameId,
    milestoneId: "first-win",
    unlockedAt: world.now,
    userId: player,
    verification: "self-reported",
  });
  const set = await referrals.rewards.programs.setProgram(
    null,
    referralProgramKey,
    {
      enabled: true,
      kind: "referral-cut",
      maturitySeconds: 0,
      minimumPayout: 0n,
      params: { rateBasisPoints },
    },
  );
  if (!set.ok) throw new Error(set.code);
  return { player, referrer };
}

async function claimToComplete(userId: string) {
  const { refresh, start, submit } = operations();
  const session = sessionFor(userId);
  const started = await start.execute(input, session);
  if (!started.ok || started.value.status !== "started")
    throw new Error(`not started: ${JSON.stringify(started)}`);
  const { claim } = started.value;
  if (claim.toSign === null) throw new Error("nothing to sign");
  await submit.execute(
    { claimId: claim.id, signed: sign(claim.toSign) },
    session,
  );
  world.network.controls.advance(chain, 3);
  for (let look = 0; look < 3; look += 1)
    await refresh.execute({ claimId: claim.id }, session);
  return { claimId: claim.id, refresh, session };
}

const potOf = (referrer: string) =>
  referrals.rewards.balances.balance({
    assetKey: feeAsset,
    beneficiaryId: referrer,
    programKey: referralProgramKey,
  });
const entriesOf = async (referrer: string) =>
  (await referrals.rewards.balances.entries(referrer, referralProgramKey))
    .items;

describe("the referrer's cut of a claim", () => {
  it("is earned once, when the claim of the person they brought is complete, and not before", async () => {
    const { player, referrer } = await setUp(3_000n);
    const { refresh, session, claimId } = await claimToComplete(player);
    expect(await entriesOf(referrer)).toMatchObject([
      { amount: 90n, assetKey: feeAsset, beneficiaryId: referrer },
    ]);
    expect((await potOf(referrer)).payable).toBe(90n);
    // Looking at the complete claim again, as a page does, earns nothing more.
    await refresh.execute({ claimId }, session);
    await refresh.execute({ claimId }, session);
    expect(await entriesOf(referrer)).toHaveLength(1);
    expect((await potOf(referrer)).payable).toBe(90n);
  });

  it("is not earned while the claim is only on its way", async () => {
    const { player, referrer } = await setUp(3_000n);
    const { start, submit } = operations();
    const session = sessionFor(player);
    const started = await start.execute(input, session);
    if (!started.ok || started.value.status !== "started")
      throw new Error(`not started: ${JSON.stringify(started)}`);
    if (started.value.claim.toSign === null) throw new Error("nothing to sign");
    await submit.execute(
      {
        claimId: started.value.claim.id,
        signed: sign(started.value.claim.toSign),
      },
      session,
    );
    expect(await entriesOf(referrer)).toEqual([]);
  });

  it("is nothing for a player who signed in with no code, or whose referrer is frozen, or when the platform charged no fee", async () => {
    const lone = await signInWith(null, `${randomUUID()}@example.test`);
    await database.insert(gameMilestoneUnlocks).values({
      count: 1,
      gameId,
      milestoneId: "first-win",
      unlockedAt: world.now,
      userId: lone,
      verification: "self-reported",
    });
    const { player, referrer } = await setUp(3_000n);
    const staff = await signInWith(null, `${randomUUID()}@example.test`);
    await referrals.freezes.set(staff, referrer, true, "review");
    await claimToComplete(lone);
    await claimToComplete(player);
    expect(await entriesOf(referrer)).toEqual([]);
  });

  it("is nothing when the platform charged no fee", async () => {
    const { player, referrer } = await setUp(0n);
    await claimToComplete(player);
    expect(await entriesOf(referrer)).toEqual([]);
  });
});
