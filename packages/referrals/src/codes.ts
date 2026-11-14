import { randomInt } from "node:crypto";

import type { DatabaseClient } from "@frostbite/database/connection";
import { referralCodes } from "@frostbite/database/schema/referrals";
import {
  normalizeReferralCode,
  referralCodeAlphabet,
  referralCodeLength,
} from "@frostbite/shared/referrals";
import { eq } from "drizzle-orm";

export interface CodesDependencies {
  readonly database: DatabaseClient;
  // Replaceable so a test can know the codes; the default draws each character at random from the alphabet.
  readonly randomCode?: () => string;
}

// Two people drawing the same one of 3.8 × 10^11 codes is rare, and it is a retry, not an error. A few tries are far more than ever needed.
const triesToFindFreeCode = 5;

export function drawCode(): string {
  return Array.from(
    { length: referralCodeLength },
    () => referralCodeAlphabet[randomInt(referralCodeAlphabet.length)],
  ).join("");
}

// A person's referral code: made the first time it is asked for and the same every time after, never changed. It names nobody.
export function createCodes(dependencies: CodesDependencies) {
  const { database } = dependencies;
  const randomCode = dependencies.randomCode ?? drawCode;

  async function existing(userId: string): Promise<string | null> {
    const [row] = await database
      .select({ code: referralCodes.code })
      .from(referralCodes)
      .where(eq(referralCodes.userId, userId));
    return row?.code ?? null;
  }

  return {
    // The person's code if they have one; reading it makes none (for an admin looking at a person who never opened the page).
    existing,

    // The person's code, made now if they have none. Two requests at once get the same code: the table holds one per person.
    async ensure(userId: string): Promise<string> {
      for (let attempt = 0; attempt < triesToFindFreeCode; attempt += 1) {
        const held = await existing(userId);
        if (held !== null) return held;
        const code = randomCode();
        const [made] = await database
          .insert(referralCodes)
          .values({ code, userId })
          .onConflictDoNothing()
          .returning({ code: referralCodes.code });
        if (made !== undefined) return made.code;
      }
      throw new Error("No free referral code could be made.");
    },

    // Whose code it is, or none: for a text that is not the shape of a code, nothing is looked up.
    async ownerOf(text: string): Promise<string | null> {
      const code = normalizeReferralCode(text);
      if (code === null) return null;
      const [row] = await database
        .select({ userId: referralCodes.userId })
        .from(referralCodes)
        .where(eq(referralCodes.code, code));
      return row?.userId ?? null;
    },
  };
}

export type Codes = ReturnType<typeof createCodes>;
