import { randomUUID } from "node:crypto";

import {
  authUsers,
  createDatabaseClient,
  createDatabasePool,
  parseDatabaseEnvironment,
  rewardProgramSettings,
  runMigrations,
} from "@frostbite/database";
import { chainRefSchema } from "@frostbite/shared/chain";
import { max } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach } from "vitest";
import { z } from "zod";

import { assetKeyOf } from "../../src/asset.ts";
import { createExecutorRegistry } from "../../src/executors.ts";
import { createKindRegistry, defineRewardKind } from "../../src/kinds.ts";
import { createRewards } from "../../src/service.ts";
import type { PayoutExecutor } from "../../src/executors.ts";

export const environment = parseDatabaseEnvironment(process.env);
export const pool = createDatabasePool(environment);
export const database = createDatabaseClient(pool);

export const start = new Date("2026-11-13T12:00:00.000Z");
export const clock = { now: start };
export const advance = (seconds: number) => {
  clock.now = new Date(clock.now.getTime() + seconds * 1000);
};

export const sats = assetKeyOf({
  chain: chainRefSchema.parse("simnet:one"),
  id: "sim",
  kind: "native",
});
export const otherAsset = assetKeyOf({
  chain: chainRefSchema.parse("simnet:two"),
  id: "sim",
  kind: "native",
});

// A kind made for the tests: an event "sale.completed" carries a fee and who brought the buyer, and the program pays that person a number
// of hundredths of a percent of it. It stands in for any real kind (the referral cut) to show that nothing in the ledger knows which.
export const sale = defineRewardKind({
  accrue: ({ eventId, params, payload }) =>
    payload.referrer === null
      ? []
      : [
          {
            amount:
              (BigInt(payload.fee) * BigInt(params.basisPoints)) / 10_000n,
            assetKey: sats,
            beneficiaryId: payload.referrer,
            sourceKey: `sale:${eventId}`,
          },
        ].filter((draft) => draft.amount > 0n),
  eventType: "sale.completed",
  id: "test-sale-cut",
  paramsSchema: z
    .object({ basisPoints: z.number().int().min(1).max(9_999) })
    .strict(),
  payloadSchema: z
    .object({ fee: z.string().regex(/^\d+$/u), referrer: z.uuid().nullable() })
    .strict(),
});

// A second kind on a different event, which asks for several earnings at once and for one it should not, when told to.
export const bonus = defineRewardKind({
  accrue: ({ eventId, payload }) =>
    payload.people.map((person, index) => ({
      amount: payload.amount === "bad" ? 0n : BigInt(payload.amount),
      assetKey: sats,
      beneficiaryId: person,
      sourceKey: `bonus:${eventId}:${String(index)}`,
    })),
  eventType: "bonus.awarded",
  id: "test-bonus",
  paramsSchema: z.object({}).strict(),
  payloadSchema: z
    .object({ amount: z.string(), people: z.array(z.uuid()) })
    .strict(),
});

export const policy = {
  maximumMaturitySeconds: 86_400 * 30,
  maximumMinimumPayout: 1_000_000n,
};

// Executors for the tests: one that pays at once, one that takes the payout and reports later, one that refuses, one that throws.
export const behaviour = {
  kind: "accept" as "accept" | "complete" | "refuse" | "throw",
};
export const handed: string[] = [];
export const testExecutor: PayoutExecutor = {
  id: "test-executor",
  start: async (payout) => {
    handed.push(payout.id);
    if (behaviour.kind === "throw") throw new Error("the executor broke");
    if (behaviour.kind === "complete")
      return { kind: "completed", ref: `tx-${payout.id}` };
    if (behaviour.kind === "refuse")
      return { kind: "refused", reason: "address-not-accepted" };
    return { kind: "accepted" };
  },
  supports: (assetKey) => assetKey === sats,
};

let counter = 0;
export const rewards = createRewards({
  clock: () => clock.now,
  database,
  executors: createExecutorRegistry([testExecutor]),
  kinds: createKindRegistry([sale, bonus]),
  newId: () => {
    counter += 1;
    return randomUUID();
  },
  policy,
});

export async function seedUser(): Promise<string> {
  const id = randomUUID();
  await database
    .insert(authUsers)
    .values({ email: `${id}@example.test`, id, name: "Player" });
  return id;
}

// A program key no other test uses (the database lasts for the whole file), turned on with the sale kind.
export function freshProgram(): string {
  counter += 1;
  return `p-${String(counter)}-${randomUUID().slice(0, 8)}`;
}

export async function startProgram(
  programKey: string,
  options: {
    basisPoints?: number;
    enabled?: boolean;
    maturitySeconds?: number;
    minimumPayout?: bigint;
  } = {},
) {
  const result = await rewards.programs.setProgram(null, programKey, {
    enabled: options.enabled ?? true,
    kind: "test-sale-cut",
    maturitySeconds: options.maturitySeconds ?? 0,
    minimumPayout: options.minimumPayout ?? 0n,
    params: { basisPoints: options.basisPoints ?? 300 },
  });
  if (!result.ok)
    throw new Error(`Could not start the program: ${result.code}`);
  return result.setting;
}

let eventCounter = 0;
export function saleEvent(
  referrer: string | null,
  fee: bigint,
  occurredAt = clock.now,
) {
  eventCounter += 1;
  return {
    id: `sale-${String(eventCounter)}-${randomUUID().slice(0, 8)}`,
    occurredAt,
    payload: { fee: fee.toString(), referrer },
    type: "sale.completed",
  };
}

// Every test starts a day after the newest setting in the database (which lasts for the whole run and is shared by every file), so the
// settings a test makes are always newer than those left before it, and with every earlier program switched off, so an event told in one
// test earns nothing for another's.
export function registerDatabase(): void {
  beforeAll(async () => runMigrations(environment));
  beforeEach(async () => {
    const [newest] = await database
      .select({ at: max(rewardProgramSettings.createdAt) })
      .from(rewardProgramSettings);
    clock.now = new Date(
      Math.max(start.getTime(), newest?.at?.getTime() ?? 0) + 86_400_000,
    );
    behaviour.kind = "accept";
    handed.length = 0;
    for (const setting of await rewards.programs.allInForce())
      if (setting.enabled)
        await rewards.programs.setProgram(null, setting.programKey, {
          enabled: false,
          kind: setting.kind,
          maturitySeconds: setting.maturitySeconds,
          minimumPayout: setting.minimumPayout,
          params: setting.params,
        });
  });
  afterAll(async () => pool.end());
}
