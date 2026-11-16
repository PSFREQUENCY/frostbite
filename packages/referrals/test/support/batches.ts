import { randomUUID } from "node:crypto";

import { createSimulatedChain } from "@frostbite/test-kit/simulated-chain";
import { simulatedAddress } from "@frostbite/test-kit/simulated-chain-address";
import { signSimulated } from "@frostbite/test-kit/simulated-chain-transaction";
import { chainRefSchema } from "@frostbite/shared/chain";

import { createBatchRepository } from "../../src/batches/repository.ts";
import {
  createBatches,
  type BatchChainPorts,
} from "../../src/batches/service.ts";
import {
  chain,
  clock,
  database,
  feeAsset,
  referredPair,
  referrals,
} from "./fixture.ts";
import { claimOf, setProgram } from "./fixture.ts";

export const sim = createSimulatedChain({
  chains: [chain, chainRefSchema.parse("simnet:two")],
  now: () => clock.now,
});

const adapterPorts = sim.adapter.ports;
const need = <Value>(value: Value | undefined): Value => {
  if (value === undefined)
    throw new Error("the simulated adapter lacks a port");
  return value;
};
export const ports: BatchChainPorts = {
  addressCodec: need(adapterPorts.addressCodec),
  broadcaster: need(adapterPorts.broadcaster),
  builder: need(adapterPorts.builder),
  contracts: need(adapterPorts.contracts),
  observer: need(adapterPorts.observer),
};

export const batches = createBatches({
  clock: () => clock.now,
  delay: { maxUnsettledMs: 3_600_000 },
  funding: () => ({
    maxFee: { asset: { chain, id: "sim", kind: "native" }, baseUnits: 10n },
  }),
  newId: randomUUID,
  ports: (on) => (on === chain ? ports : null),
  repository: createBatchRepository(database, { clock: () => clock.now }),
  rewards: referrals.rewards,
});

export { signSimulated };

// An address the simulated chain accepts: six hex digits and the chain's own check of them.
export const addressOf = (body: string): string =>
  simulatedAddress(chain, body).value;

// A referrer who has earned `fee` times 3% and asked to be paid it, to `to`: the payout waiting for a batch.
export async function waitingPayout(fee: bigint, to: string) {
  const { person, referrer } = await referredPair();
  await setProgram(300, true, 0);
  await referrals.accrual.claimCompleted(claimOf(person, fee));
  const asked = await referrals.rewards.payouts.request({
    assetKey: feeAsset,
    beneficiaryId: referrer,
    destination: to,
    programKey: "referral",
  });
  if (asked.kind !== "requested")
    throw new Error(`not requested: ${asked.kind}`);
  return { payout: asked.payout, referrer };
}
