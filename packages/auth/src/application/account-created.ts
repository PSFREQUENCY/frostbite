import type { DatabaseTransaction } from "@frostbite/database/connection";

// How a new account was opened: with a wallet (which one) or with an address or number that received a code. Said as far as a rule about
// who may be linked to whom needs it.
export type NewAccountSource =
  | {
      readonly kind: "wallet";
      readonly network: string;
      readonly scriptIdentity: string;
    }
  | { readonly kind: "contact" };

export interface NewAccount {
  // The code of whoever referred the person, as the sign-in request carried it (unchecked: whoever listens decides what it is worth).
  readonly referralCode: string | null;
  readonly source: NewAccountSource;
  readonly userId: string;
}

// Told, inside the transaction that makes a new account, that it is being made. Whatever it writes is kept with the account or not at all.
// Sign-in knows nothing of what it is for (today, the link to a referrer): the platform gives the one it wants, or none.
export type AccountCreatedHook = (
  transaction: DatabaseTransaction,
  account: NewAccount,
) => Promise<void>;
