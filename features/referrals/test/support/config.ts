import { createSimulatedChain } from "@frostbite/test-kit/simulated-chain";
import { simulatedAddress } from "@frostbite/test-kit/simulated-chain-address";
import { chainRefSchema } from "@frostbite/shared/chain";

import type { ReferralsFeatureConfig } from "../../src/config.ts";
import { policy } from "./data.ts";

// The platform's chain in the tests: the simulated one, on its own clock. "down…" is an address its codec cannot say anything about (the
// chain cannot be asked), and a chain it does not serve is none.
export const servedChain = chainRefSchema.parse("simnet:one");
export const clock = { now: new Date("2026-11-14T12:00:00.000Z") };
export const sim = createSimulatedChain({
  chains: [servedChain],
  now: () => clock.now,
});
const adapter = sim.adapter.ports;
const need = <Value>(value: Value | undefined): Value => {
  if (value === undefined) throw new Error("the simulated chain lacks a port");
  return value;
};
const codec = need(adapter.addressCodec);
export const ports = {
  addressCodec: {
    minimumOutput: codec.minimumOutput.bind(codec),
    parse: (chain: typeof servedChain, text: string) => {
      if (text.startsWith("down")) throw new Error("unreachable");
      return codec.parse(chain, text);
    },
  },
  broadcaster: need(adapter.broadcaster),
  builder: need(adapter.builder),
  contracts: need(adapter.contracts),
  observer: need(adapter.observer),
};
// An address the simulated chain accepts.
export const addressOf = (body: string): string =>
  simulatedAddress(servedChain, body).value;

export const featureConfig = (
  over: Partial<ReferralsFeatureConfig> = {},
): ReferralsFeatureConfig => ({
  chain: (chain) =>
    chain !== servedChain
      ? null
      : {
          funding: {
            maxFee: {
              asset: { chain, id: "sim", kind: "native" },
              baseUnits: 10n,
            },
          },
          ports,
        },
  delay: { maxUnsettledMs: 3_600_000 },
  explorerTxUrl: "https://explorer.test/tx/{id}",
  policy,
  signingWallets: ["unisat"],
  ...over,
});
