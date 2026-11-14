import { InvalidAddressError } from "@frostbite/chain/ports";

import type { ReferralsFeatureConfig } from "../../src/config.ts";
import { policy } from "./data.ts";

// A chain with address rules of its own: "bad…" is not an address, "down…" cannot be checked, anything else is written upper-case and may
// carry 100 or more. A chain it does not serve is none.
export const servedChain = "simnet:one";
export const featureConfig = (
  over: Partial<ReferralsFeatureConfig> = {},
): ReferralsFeatureConfig => ({
  chain: (chain) =>
    chain !== servedChain
      ? null
      : {
          ports: {
            addressCodec: {
              minimumOutput: () => 100n,
              parse: (given, text) => {
                if (text.startsWith("bad"))
                  throw new InvalidAddressError("not an address");
                if (text.startsWith("down")) throw new Error("unreachable");
                return { chain: given, value: text.toUpperCase() };
              },
            },
          },
        },
  policy,
  ...over,
});
