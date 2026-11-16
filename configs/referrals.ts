import type { ReferralsFeatureConfig } from "@frostbite/feature-referrals";

import { betaChain } from "./chains.ts";
import { rewardsChain } from "./game-rewards.ts";
import { rewardsPolicy } from "./rewards-policy.ts";

// What the referral program (ADR-026) needs of the platform beyond what an admin sets on the program itself (the rate, the minimum payout,
// the wait: those are settings, kept as a log). The ceilings keep a slip of the keyboard from making the program wait for months or demand
// an unreachable minimum: proposals, for the owner to confirm or change (ADR-026 leaves them to the owner).
export const referralsConfig: ReferralsFeatureConfig = {
  // Paying referrers is a step staff sign on the rewards chain, as the games' steps are (see `game-rewards.ts`).
  chain: rewardsChain,
  delay: rewardsPolicy.delay,
  explorerTxUrl: betaChain.explorerTxUrl,
  signingWallets: rewardsPolicy.signingWallets,
  policy: {
    // 30 days, in seconds.
    maximumMaturitySeconds: 30 * 24 * 60 * 60,
    // 0.1 BTC, in satoshis.
    maximumMinimumPayout: 10_000_000n,
  },
};
