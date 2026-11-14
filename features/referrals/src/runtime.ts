import { randomUUID } from "node:crypto";

import {
  createDatabaseClient,
  createDatabasePool,
  parseDatabaseEnvironment,
} from "@frostbite/database/connection";
import { authUsers } from "@frostbite/database/schema/auth";
import { memoizeUntilFailure } from "@frostbite/plugin-kit/lazy";
import { InvalidAddressError } from "@frostbite/chain/ports";
import {
  createBatchRepository,
  createBatches,
  createPayoutClaims,
  createReferralReads,
  type DestinationCheck,
} from "@frostbite/referrals";
import { chainOfAssetKey } from "@frostbite/rewards";
import { chainRefSchema } from "@frostbite/shared/chain";
import { inArray } from "drizzle-orm";

import type { ReferralsFeatureConfig } from "./config.ts";

// The account side of the referral pages: one connection pool, made on first use, and the program's reads over it. The configuration is the
// ceilings an admin may not set the program past, which the pages also show as hints.
export function createReferralsResolver(
  config: ReferralsFeatureConfig,
  environment: NodeJS.ProcessEnv = process.env,
  clock: () => Date = () => new Date(),
) {
  return memoizeUntilFailure(async () => {
    const database = createDatabaseClient(
      createDatabasePool(parseDatabaseEnvironment(environment)),
    );
    const reads = createReferralReads({
      clock,
      database,
      newId: randomUUID,
      policy: config.policy,
    });
    // Where a payout may go, as the chain of its asset says: the address as the chain writes it and the least an output to it may carry.
    const check: DestinationCheck = async (assetKey, text) => {
      const chain = chainRefSchema.parse(chainOfAssetKey(assetKey));
      const served = config.chain(chain);
      if (served === null) return { ok: false, reason: "chain-unavailable" };
      try {
        const address = served.ports.addressCodec.parse(chain, text);
        return {
          address: address.value,
          minimumOutput: served.ports.addressCodec.minimumOutput(address),
          ok: true,
        };
      } catch (error) {
        if (error instanceof InvalidAddressError)
          return { ok: false, reason: "invalid" };
        return { ok: false, reason: "chain-unavailable" };
      }
    };
    return {
      ...reads,
      // Paying referrers in a batch: staff build it, sign it, and the platform sends it and follows it.
      batches: createBatches({
        clock,
        delay: config.delay,
        // A chain the platform does not serve has no policy; its batches never get as far as asking (the ports are none first).
        funding: (chain) => {
          const served = config.chain(chain);
          if (served === null)
            throw new Error(`No funding policy for ${chain}.`);
          return served.funding;
        },
        newId: randomUUID,
        ports: (chain) => config.chain(chain)?.ports ?? null,
        repository: createBatchRepository(database, { clock }),
        rewards: reads.rewards,
      }),
      payouts: createPayoutClaims({ check, database, rewards: reads.rewards }),
      // The names of the accounts that changed the program, for the log of changes; an account that is gone has none.
      names: async (ids: readonly string[]): Promise<Map<string, string>> =>
        ids.length === 0
          ? new Map()
          : new Map(
              (
                await database
                  .select({ id: authUsers.id, name: authUsers.name })
                  .from(authUsers)
                  .where(inArray(authUsers.id, [...new Set(ids)]))
              ).map(({ id, name }) => [id, name]),
            ),
    };
  });
}

export type ReferralsRuntime = Awaited<
  ReturnType<ReturnType<typeof createReferralsResolver>>
>;
