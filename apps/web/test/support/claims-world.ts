import { randomUUID } from "node:crypto";

import {
  authUsers,
  createDatabaseClient,
  createDatabasePool,
  gameAdminSteps,
  gameContracts,
  gameMilestoneUnlocks,
  parseDatabaseEnvironment,
  publishedTemplates,
  runMigrations,
} from "@frostbite/database";
import { writeRecording } from "@frostbite/database/game-contracts";
import {
  createListGameClaimsOperation,
  createRefreshGameClaimOperation,
  createStartGameClaimOperation,
  createSubmitGameClaimOperation,
} from "@frostbite/feature-games/claims-operations";
import { createGameClaimsResolver } from "@frostbite/feature-games/claims-runtime";
import { chainRefSchema } from "@frostbite/shared/chain";
import { defineGame, type GameClaim } from "@frostbite/shared/games";
import { correlationIdSchema } from "@frostbite/shared/http";
import { uuidV7Schema } from "@frostbite/shared/identifiers";
import { createSimulatedChain } from "@frostbite/test-kit/simulated-chain";
import {
  nativeAsset,
  simulatedFamily,
} from "@frostbite/test-kit/simulated-chain-transaction";
import { afterAll, beforeAll, beforeEach } from "vitest";

import { testReferrals } from "./referrals-config.ts";

// The claim path as the page drives it, against real PostgreSQL and the simulated chain, with a game the platform has never heard of that
// declares a rewards contract. Only the HTTP framing around the operations is left out (the route's session, origin and rate limit are
// covered where they live). Shared by the tests of claiming and of what a claim earns.
export const environment = parseDatabaseEnvironment(process.env);
export const pool = createDatabasePool(environment);
export const database = createDatabaseClient(pool);
export const chain = chainRefSchema.parse("simnet:one");
export const gameId = "claim-game";
export const wallet = "sim:one:a1b2c3fe";
export const game = defineGame({
  capabilities: ["milestone:claim"],
  description: "",
  id: gameId,
  launch: { mode: "embedded" },
  milestones: [
    {
      claimPolicy: "once",
      criteria: "Win.",
      description: "You won.",
      id: "first-win",
      title: "First win",
    },
  ],
  network: chain,
  rewards: { templateId: "game-rewards", templateVersion: "1.0.0" },
  schemaVersion: 1,
  summary: "A game.",
  tags: ["arcade"],
  title: "Claim game",
  version: "1",
});
export const sessionFor = (userId: string | null) => ({
  actorSession: null,
  actorUserId: userId === null ? null : uuidV7Schema.parse(userId),
  correlationId: correlationIdSchema.parse(randomUUID()),
});

// The clock and the chain of the test in hand: a test moves the clock and advances the chain through these.
export const world: {
  network: ReturnType<typeof createSimulatedChain>;
  now: Date;
} = {
  network: createSimulatedChain({
    chains: [chain],
    now: () => world.now,
  }),
  now: new Date("2026-10-16T12:00:00.000Z"),
};
const ports = () => {
  const { addressCodec, broadcaster, builder, contracts, observer, rewards } =
    world.network.adapter.ports;
  if (
    !addressCodec ||
    !broadcaster ||
    !builder ||
    !contracts ||
    !observer ||
    !rewards
  )
    throw new Error("The simulated adapter lacks a port.");
  return { addressCodec, broadcaster, builder, contracts, observer, rewards };
};
const configured = () => ({
  chain: () => ({
    funding: { maxFee: { asset: nativeAsset(chain), baseUnits: 10n } },
    ports: ports(),
  }),
  clock: () => world.now,
  delay: { maxLagBlocks: 2, maxUnsettledMs: 60 * 60_000 },
  referrals: testReferrals,
});
// The game's contract on record, as the step that created it left it: nothing is configured, so a game has a contract only once that step
// completed.
async function recordContract() {
  const id = randomUUID();
  await database.insert(gameAdminSteps).values({
    chain,
    expiresAt: world.now,
    gameId,
    id,
    operation: "deploy",
    state: "awaiting_signature",
    summary: {},
    unsignedFamily: simulatedFamily,
    unsignedFormat: "f",
    unsignedPayload: "p",
  });
  await writeRecording(
    database,
    { chain, id },
    {
      address: "rewards-1",
      family: simulatedFamily,
      gameId,
      kind: "game",
      maxDrawingBytes: 4096,
    },
  );
}
export const operations = () => {
  const resolver = createGameClaimsResolver([game], configured());
  return {
    list: createListGameClaimsOperation(resolver),
    refresh: createRefreshGameClaimOperation(resolver),
    start: createStartGameClaimOperation(resolver),
    submit: createSubmitGameClaimOperation(resolver),
  };
};

export async function seedPlayer(earned = true) {
  const random = randomUUID();
  const id = `0198a000-${random.slice(9, 13)}-7${random.slice(15, 18)}-8${random.slice(20, 23)}-${random.slice(24)}`;
  await database
    .insert(authUsers)
    .values({ email: `${id}@example.test`, id, name: "Player" });
  if (earned)
    await database.insert(gameMilestoneUnlocks).values({
      count: 1,
      gameId,
      milestoneId: "first-win",
      unlockedAt: world.now,
      userId: id,
      verification: "self-reported",
    });
  return id;
}
export const input = { gameId, milestoneId: "first-win", wallet };
// The wallet's part: the simulated wallet signs by appending its marker to what it was shown.
export const sign = (toSign: NonNullable<GameClaim["toSign"]>) => ({
  ...toSign,
  payload: `${toSign.payload}.sig`,
});

// Migrates once, starts each test with a new chain, the clock at its start and the game's contract on record, and closes the pool at the end.
export function registerClaimsWorld(): void {
  beforeAll(async () => runMigrations(environment));
  beforeEach(async () => {
    world.now = new Date("2026-10-16T12:00:00.000Z");
    world.network = createSimulatedChain({
      chains: [chain],
      now: () => world.now,
    });
    await database.delete(gameContracts);
    await database.delete(publishedTemplates);
    await database.delete(gameAdminSteps);
    await recordContract();
  });
  afterAll(async () => pool.end());
}
