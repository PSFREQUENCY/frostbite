import type { ReferralsConfig } from "@frostbite/referrals";
import type { Address, ChainRef } from "@frostbite/shared/chain";

// What the referral pages need beyond the program's ceilings: the address rules of the chains a payout may be paid on, to check where a
// referrer asks to be paid. A chain the platform does not serve answers none, and the page says paying is not available.
export interface ReferralsFeatureConfig extends ReferralsConfig {
  chain(chain: ChainRef): {
    readonly ports: {
      readonly addressCodec: {
        minimumOutput(address: Address): bigint;
        parse(chain: ChainRef, text: string): Address;
      };
    };
  } | null;
}
