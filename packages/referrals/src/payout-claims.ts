import type { DatabaseClient } from "@frostbite/database/connection";
import { walletIdentities } from "@frostbite/database/schema/auth";
import type { Payout, Rewards } from "@frostbite/rewards";
import { asc, eq } from "drizzle-orm";

import { referralProgramKey } from "./kind.ts";

// What the chain says of a place to pay: the address as the chain writes it and the least a payment to it may carry (its dust limit), or why it
// cannot be paid to. Given by the platform, which alone knows the chains it serves.
export type DestinationCheck = (
  assetKey: string,
  address: string,
) => Promise<
  | {
      readonly address: string;
      readonly minimumOutput: bigint;
      readonly ok: true;
    }
  | { readonly ok: false; readonly reason: "chain-unavailable" | "invalid" }
>;

export type PayoutClaimResult =
  | { readonly kind: "requested"; readonly payout: Payout }
  | { readonly kind: "already-open"; readonly payout: Payout }
  // What is payable is under the program's minimum payout.
  | {
      readonly kind: "below-minimum";
      readonly minimum: bigint;
      readonly payable: bigint;
    }
  // What is payable is under what the network would relay to that address, so it could not be paid (the platform pays the network's fee, but
  // not an output the network refuses).
  | {
      readonly kind: "below-dust";
      readonly minimum: bigint;
      readonly payable: bigint;
    }
  | {
      readonly kind:
        | "chain-unavailable"
        | "invalid-destination"
        | "not-your-wallet"
        | "program-not-set";
    };

export interface PayoutClaimsDependencies {
  readonly check: DestinationCheck;
  readonly database: DatabaseClient;
  readonly rewards: Pick<Rewards, "balances" | "payouts" | "programs">;
}

// A referrer asking to be paid what is payable. They are paid to a wallet that is on their own account (the page offers those, and the request
// is refused for any other), written as the chain writes it, and only if the whole pot reaches both the program's minimum and what the network
// would relay to that address. The ledger takes all that is payable at once, or nothing, and one payout is open at a time.
export function createPayoutClaims(dependencies: PayoutClaimsDependencies) {
  const { check, database, rewards } = dependencies;

  async function wallets(userId: string): Promise<readonly string[]> {
    return (
      await database
        .select({ address: walletIdentities.address })
        .from(walletIdentities)
        .where(eq(walletIdentities.userId, userId))
        .orderBy(asc(walletIdentities.createdAt))
    ).map(({ address }) => address);
  }

  // A person's payouts that are not over (waiting for a batch, or in one), newest first.
  async function open(userId: string): Promise<readonly Payout[]> {
    return (
      await rewards.payouts.listFor(userId, referralProgramKey, 20)
    ).filter(({ state }) => state === "requested" || state === "in_progress");
  }

  return {
    // The wallets of the account, oldest first: the places the page offers to pay to.
    wallets,

    open,

    async claim(input: {
      readonly assetKey: string;
      readonly destination: string;
      readonly userId: string;
    }): Promise<PayoutClaimResult> {
      if (!(await wallets(input.userId)).includes(input.destination))
        return { kind: "not-your-wallet" };
      const checked = await check(input.assetKey, input.destination);
      if (!checked.ok)
        return {
          kind:
            checked.reason === "chain-unavailable"
              ? "chain-unavailable"
              : "invalid-destination",
        };
      const setting = await rewards.programs.inForce(referralProgramKey);
      if (setting === null) return { kind: "program-not-set" };
      // A payout that is not over is the answer, whatever is left in the pot (it was emptied into that payout).
      const [existing] = (await open(input.userId)).filter(
        ({ assetKey }) => assetKey === input.assetKey,
      );
      if (existing !== undefined)
        return { kind: "already-open", payout: existing };
      const { payable } = await rewards.balances.balance({
        assetKey: input.assetKey,
        beneficiaryId: input.userId,
        programKey: referralProgramKey,
      });
      if (payable < checked.minimumOutput)
        return {
          kind: "below-dust",
          minimum: checked.minimumOutput,
          payable,
        };
      const result = await rewards.payouts.request({
        assetKey: input.assetKey,
        beneficiaryId: input.userId,
        destination: checked.address,
        programKey: referralProgramKey,
      });
      switch (result.kind) {
        case "requested":
        case "already-open":
          return result;
        case "below-minimum":
          return {
            kind: "below-minimum",
            minimum: result.minimum,
            payable: result.payable,
          };
        case "invalid-destination":
          return { kind: "invalid-destination" };
        case "unknown-program":
          return { kind: "program-not-set" };
      }
    },
  };
}

export type PayoutClaims = ReturnType<typeof createPayoutClaims>;
