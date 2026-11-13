import type { AccountCreatedHook } from "@frostbite/auth";
import { linkNewAccount } from "@frostbite/referrals";

// What happens when sign-in makes a new account: if the person arrived with a referral code, the account is linked to whoever it belongs to,
// in the same transaction that makes the account (so the link exists when the account does and never later). A code that is not worth a link
// (unknown, the person's own, a wallet the referrer gave up) makes none and never stops the sign-in.
export const linkReferralOnNewAccount: AccountCreatedHook = async (
  transaction,
  account,
) => {
  await linkNewAccount(transaction, {
    code: account.referralCode,
    identity: account.source,
    referredUserId: account.userId,
  });
};
