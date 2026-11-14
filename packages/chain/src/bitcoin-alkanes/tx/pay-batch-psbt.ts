import { Psbt } from "bitcoinjs-lib";

import type { NodeUtxo } from "../node/esplora.ts";

// Opts in to replacement (BIP 125), so a batch that sticks can be bumped.
const replaceableSequence = 0xfffffffd;

export interface PayBatchPlan {
  readonly changeSats: bigint;
  readonly inputs: readonly NodeUtxo[];
  // Who is paid and how much, in the order the person signing was shown them.
  readonly payments: readonly {
    readonly sats: bigint;
    readonly script: Uint8Array;
  }[];
  // The sender's own output script: it owns every input and receives any change.
  readonly senderScript: Uint8Array;
}

// Outputs, in this order: each payment as shown, then change when there is any. Nothing else is paid to anyone.
export function buildPayBatchPsbt(plan: PayBatchPlan): Psbt {
  const psbt = new Psbt();
  psbt.setVersion(2);
  for (const input of plan.inputs) {
    psbt.addInput({
      hash: input.txid,
      index: input.vout,
      sequence: replaceableSequence,
      witnessUtxo: { script: plan.senderScript, value: input.value },
    });
  }
  for (const payment of plan.payments)
    psbt.addOutput({ script: payment.script, value: payment.sats });
  if (plan.changeSats > 0n)
    psbt.addOutput({ script: plan.senderScript, value: plan.changeSats });
  return psbt;
}
