import { assetKeyOf } from "@frostbite/rewards";
import { chainRefSchema } from "@frostbite/shared/chain";
import { nativeAsset } from "@frostbite/test-kit/simulated-chain-transaction";

// What the referral program is given in the tests that drive claims: ceilings no test goes near, and the asset a fee on the simulated chain
// is an amount of (the claims service takes it from the chain's own fee ceiling).
export const feeAsset = assetKeyOf(
  nativeAsset(chainRefSchema.parse("simnet:one")),
);
export const testReferrals = {
  policy: { maximumMaturitySeconds: 86_400, maximumMinimumPayout: 1_000n },
};
