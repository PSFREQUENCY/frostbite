import { InvalidAddressError } from "@frostbite/chain/ports";
import { chainOfAssetKey, type Rewards } from "@frostbite/rewards";
import { chainRefSchema, type ChainRef } from "@frostbite/shared/chain";

import { referralProgramKey } from "../kind.ts";
import type { BatchChainPorts } from "./service.ts";

export type CoverResult =
  | {
      readonly heldUnits: bigint;
      // The payouts waiting for a batch in the asset, and what they add up to.
      readonly payments: number;
      readonly pendingUnits: bigint;
      readonly waitingUnits: bigint;
      readonly ok: true;
    }
  | {
      readonly ok: false;
      readonly reason: "chain-unavailable" | "invalid-wallet";
    };

export interface CoverDependencies {
  readonly ports: (chain: ChainRef) => BatchChainPorts | null;
  readonly rewards: Pick<Rewards, "payouts">;
}

// How many waiting payouts one look reads: a batch holds at most this many in any case (see `maxBatchPayments`), and a wallet that does not
// cover what a batch could take does not cover the batch.
const readLimit = 500;

// What a wallet holds against what waits to be paid in an asset, before a batch is built. A read: it changes nothing, and asking again is
// harmless. The network fee is not in it; it comes on top when the batch is built.
export function createCover({ ports, rewards }: CoverDependencies) {
  return async (input: {
    readonly assetKey: string;
    readonly wallet: string;
  }): Promise<CoverResult> => {
    const chain = chainRefSchema.safeParse(chainOfAssetKey(input.assetKey));
    const served = chain.success ? ports(chain.data) : null;
    if (!chain.success || served === null)
      return { ok: false, reason: "chain-unavailable" };
    let wallet;
    try {
      wallet = served.addressCodec.parse(chain.data, input.wallet);
    } catch (error) {
      return {
        ok: false,
        reason:
          error instanceof InvalidAddressError
            ? "invalid-wallet"
            : "chain-unavailable",
      };
    }
    let held;
    try {
      held = await served.observer.balance(chain.data, wallet.value);
    } catch {
      return { ok: false, reason: "chain-unavailable" };
    }
    const waiting = await rewards.payouts.requestedIn(
      input.assetKey,
      referralProgramKey,
      readLimit,
    );
    return {
      heldUnits: held.confirmed,
      ok: true,
      payments: waiting.length,
      pendingUnits: held.pending,
      waitingUnits: waiting.reduce((sum, { amount }) => sum + amount, 0n),
    };
  };
}
