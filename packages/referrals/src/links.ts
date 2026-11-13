import type { DatabaseTransaction } from "@frostbite/database/connection";
import {
  referralCodes,
  referralLinks,
} from "@frostbite/database/schema/referrals";
import { releasedWallets } from "@frostbite/database/schema/wallet-release";
import { normalizeReferralCode } from "@frostbite/shared/referrals";
import { and, eq } from "drizzle-orm";

import type { LinkOutcome, NewAccountIdentity } from "./types.ts";

// Makes the one link of a NEW account to the person who referred it, inside the transaction that makes the account, so the link exists exactly
// when the account does and never later. It is meant for nothing else: an account that already existed is never given a referrer, because
// the only caller is the step that makes accounts.
//
// The rules, each of which refuses the link and never the account:
// - the text must be a code someone holds;
// - nobody refers themselves;
// - an account opened with a wallet that the referrer's own account released is the referrer's own wallet in a new account (the held
//   wallets table remembers who gave a wallet up; an address given up is not recorded anywhere, so that case is not caught).
// A referrer who is frozen still gets the link: freezing stops what is earned, not who brought whom.
export async function linkNewAccount(
  transaction: DatabaseTransaction,
  input: {
    readonly code: string | null;
    readonly identity: NewAccountIdentity;
    readonly referredUserId: string;
  },
): Promise<LinkOutcome> {
  const code = normalizeReferralCode(input.code);
  if (code === null) return { kind: "not-linked", reason: "no-code" };
  const [owner] = await transaction
    .select({ userId: referralCodes.userId })
    .from(referralCodes)
    .where(eq(referralCodes.code, code));
  if (owner === undefined)
    return { kind: "not-linked", reason: "unknown-code" };
  if (owner.userId === input.referredUserId)
    return { kind: "not-linked", reason: "self" };
  if (input.identity.kind === "wallet") {
    const [gaveItUp] = await transaction
      .select({ id: releasedWallets.id })
      .from(releasedWallets)
      .where(
        and(
          eq(releasedWallets.network, input.identity.network),
          eq(releasedWallets.scriptIdentity, input.identity.scriptIdentity),
          eq(releasedWallets.previousUserId, owner.userId),
        ),
      );
    if (gaveItUp !== undefined)
      return { kind: "not-linked", reason: "shared-identity" };
  }
  await transaction.insert(referralLinks).values({
    code,
    referredUserId: input.referredUserId,
    referrerId: owner.userId,
  });
  return { kind: "linked", referrerId: owner.userId };
}
