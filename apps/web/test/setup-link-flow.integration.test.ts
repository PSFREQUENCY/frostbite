import { randomBytes, randomUUID } from "node:crypto";

import {
  createDrizzleSetupLinks,
  createSetupLinkService,
} from "@frostbite/authorization";
import {
  authUsers,
  createDatabaseClient,
  createDatabasePool,
  parseDatabaseEnvironment,
  platformRoleAssignments,
  platformRoleEvents,
  platformSetupLinks,
  runMigrations,
  walletIdentities,
} from "@frostbite/database";
import { createHeldMethodKinds } from "@frostbite/feature-accounts";
import { createRedeemSetupLinkOperation } from "@frostbite/feature-accounts/setup-operation";
import {
  createScratchDatabase,
  dropScratchDatabase,
} from "@frostbite/database/test-scratch-database";
import { correlationIdSchema } from "@frostbite/shared/http";
import { createUuidV7, type UuidV7 } from "@frostbite/shared/identifiers";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { authMethods } from "@repo/configs/auth-methods";
import { authorizationPolicy } from "@repo/configs/authorization";

// The setup link as the page drives it, against real PostgreSQL: the HTTP operation, the service and the platform's real sign-in
// method registry together (the framing around them, with its session and origin checks, is covered with the other auth routes).
//
// It runs in a database of its own. Setup is possible only while no administrator exists, and each test starts from an empty set of accounts,
// both of which are facts about the whole database: in the one the other files share, emptying the accounts meets their rows (a ledger entry
// holds on to the account behind it) and an administrator made there ends setup for this file.
const environment = parseDatabaseEnvironment(process.env);
const databaseName = "setup_link_flow_test";
const scratchUrl = new URL(environment.DATABASE_URL);
scratchUrl.pathname = `/${databaseName}`;
const scratchEnvironment = {
  ...environment,
  DATABASE_MIGRATION_URL: scratchUrl.toString(),
};
const admin = createDatabasePool(environment);
const pool = createDatabasePool(environment, scratchUrl.toString());
const database = createDatabaseClient(pool);
const service = createSetupLinkService({
  clock: () => new Date(),
  policy: { lifetimeMs: 3_600_000, policyVersion: authorizationPolicy.version },
  randomBytes: (length) => randomBytes(length),
  repository: createDrizzleSetupLinks(database, {
    heldKinds: createHeldMethodKinds(authMethods),
    requiredMethods: authorizationPolicy.requiredMethods,
  }),
});
const operation = createRedeemSetupLinkOperation(() => service);

const shared = createDatabaseClient(admin);

async function person(
  withWallet: boolean,
  into: typeof database = database,
): Promise<UuidV7> {
  const id = createUuidV7();
  await into
    .insert(authUsers)
    .values({ email: `${id}@example.test`, id, name: "Person" });
  if (withWallet)
    await into.insert(walletIdentities).values({
      address: `tb1q${id.replaceAll("-", "").slice(0, 30)}`,
      id: createUuidV7(),
      network: "signet",
      scriptIdentity: `script-${id}`,
      userId: id,
      walletAdapter: "xverse",
    });
  return id;
}
const asUser = (userId: UuidV7) => {
  const now = new Date();
  return {
    actorSession: {
      absoluteExpiresAt: new Date(now.getTime() + 60_000),
      authenticatedAt: now,
      idleExpiresAt: new Date(now.getTime() + 30_000),
      sessionId: createUuidV7(),
      userId,
    },
    actorUserId: userId,
    correlationId: correlationIdSchema.parse(randomUUID()),
  };
};
async function mintToken(): Promise<string> {
  const minted = await service.mint();
  if (minted.kind !== "minted") throw new Error("expected a link");
  return minted.token;
}

async function clean() {
  await database.delete(platformSetupLinks);
  await database.delete(platformRoleEvents);
  await database.delete(platformRoleAssignments);
  await database.delete(walletIdentities);
  await database.delete(authUsers);
}

beforeAll(async () => {
  await runMigrations(environment);
  await createScratchDatabase(admin, databaseName);
  await runMigrations(scratchEnvironment);
});
beforeEach(clean);
afterAll(async () => {
  await pool.end();
  await dropScratchDatabase(admin, databaseName);
  await admin.end();
});

describe("opening a setup link", () => {
  it("makes a signed-in person with a wallet the administrator, tells a retry so, and refuses everyone else", async () => {
    const token = await mintToken();
    const user = await person(true);
    expect(await operation.execute({ token }, asUser(user))).toEqual({
      ok: true,
      value: { status: "granted" },
    });
    expect(await operation.execute({ token }, asUser(user))).toEqual({
      ok: true,
      value: { status: "already-used-by-you" },
    });
    expect(
      await operation.execute({ token }, asUser(await person(true))),
    ).toMatchObject({ error: "not_found", ok: false });
  });

  it("is not disturbed by an administrator in the database the other files share", async () => {
    const elsewhere = await person(true, shared);
    await shared.insert(platformRoleAssignments).values({
      id: createUuidV7(),
      role: "admin",
      userId: elsewhere,
    });
    try {
      expect(
        await operation.execute(
          { token: await mintToken() },
          asUser(await person(true)),
        ),
      ).toEqual({ ok: true, value: { status: "granted" } });
    } finally {
      for (const table of ["platform_role_assignments", "wallet_identities"])
        await admin.query(`delete from frostbite.${table} where user_id = $1`, [
          elsewhere,
        ]);
      await admin.query("delete from frostbite.auth_users where id = $1", [
        elsewhere,
      ]);
    }
  });

  it("asks a person with no wallet to add one, without spending the link", async () => {
    const token = await mintToken();
    const user = await person(false);
    expect(await operation.execute({ token }, asUser(user))).toMatchObject({
      error: "conflict",
      message: expect.stringContaining("wallet"),
      ok: false,
    });
    const [link] = await database.select().from(platformSetupLinks);
    expect(link?.consumedAt).toBeNull();
  });

  it("refuses a token that is not a link without an error that says why", async () => {
    const user = await person(true);
    for (const token of ["x", "A".repeat(43)])
      expect(await operation.execute({ token }, asUser(user))).toMatchObject({
        error: "not_found",
        ok: false,
      });
  });
});
