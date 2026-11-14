import type { DatabaseClient } from "@frostbite/database/connection";
import { gameMilestoneClaims } from "@frostbite/database/schema/game-claims";
import { referralLinks } from "@frostbite/database/schema/referrals";
import { onlyRow } from "@frostbite/rewards";
import { and, count, eq, exists } from "drizzle-orm";

export interface ReferredCounts {
  // Accounts made with the person's code.
  readonly minted: number;
  // Of those, accounts with at least one completed claim.
  readonly signedUp: number;
}

// How many people a referrer brought, and how many of them have minted. A person who minted is one who completed a claim, whether or not the
// program was on at the time: it says what the referral brought, not what it paid.
export async function countReferred(
  database: DatabaseClient,
  referrerId: string,
): Promise<ReferredCounts> {
  const signedUp = onlyRow(
    await database
      .select({ value: count() })
      .from(referralLinks)
      .where(eq(referralLinks.referrerId, referrerId)),
    "count of the people a referrer brought",
  );
  const minted = onlyRow(
    await database
      .select({ value: count() })
      .from(referralLinks)
      .where(
        and(
          eq(referralLinks.referrerId, referrerId),
          exists(
            database
              .select({ one: gameMilestoneClaims.id })
              .from(gameMilestoneClaims)
              .where(
                and(
                  eq(gameMilestoneClaims.userId, referralLinks.referredUserId),
                  eq(gameMilestoneClaims.state, "complete"),
                ),
              ),
          ),
        ),
      ),
    "count of the people who minted",
  );
  return { minted: minted.value, signedUp: signedUp.value };
}
