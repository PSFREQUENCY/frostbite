import { randomUUID } from "node:crypto";

import {
  createDatabaseClient,
  createDatabasePool,
  parseDatabaseEnvironment,
} from "@frostbite/database/connection";
import { authUsers } from "@frostbite/database/schema/auth";
import { memoizeUntilFailure } from "@frostbite/plugin-kit/lazy";
import {
  createReferralReads,
  type ReferralsConfig,
} from "@frostbite/referrals";
import { inArray } from "drizzle-orm";

// The account side of the referral pages: one connection pool, made on first use, and the program's reads over it. The configuration is the
// ceilings an admin may not set the program past, which the pages also show as hints.
export function createReferralsResolver(
  config: ReferralsConfig,
  environment: NodeJS.ProcessEnv = process.env,
  clock: () => Date = () => new Date(),
) {
  return memoizeUntilFailure(async () => {
    const database = createDatabaseClient(
      createDatabasePool(parseDatabaseEnvironment(environment)),
    );
    return {
      ...createReferralReads({
        clock,
        database,
        newId: randomUUID,
        policy: config.policy,
      }),
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
