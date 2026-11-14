import type { BatchChainPorts, ReferralsConfig } from "@frostbite/referrals";
import type {
  ChainRef,
  DelayPolicy,
  FundingPolicy,
} from "@frostbite/shared/chain";

// What the referral pages need beyond the program's ceilings: the chains a payout may be paid on (to check where a referrer asks to be paid,
// and for staff to build, sign and follow a batch), how long a wait is called delayed, where a transaction is shown, and which wallets may
// sign. A chain the platform does not serve answers none, and the pages say paying is not available.
export interface ReferralsFeatureConfig extends ReferralsConfig {
  chain(chain: ChainRef): {
    readonly funding: FundingPolicy;
    readonly ports: BatchChainPorts;
  } | null;
  readonly delay: Pick<DelayPolicy, "maxUnsettledMs">;
  // Where a transaction is shown on a block explorer (`{id}` where its id goes).
  readonly explorerTxUrl: string;
  // The wallets this deployment allows staff to sign with.
  readonly signingWallets: readonly string[];
}
