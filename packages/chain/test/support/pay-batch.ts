import { Psbt } from "bitcoinjs-lib";
import type {
  FundingPolicy,
  TransactionIntent,
  UnsignedTransaction,
} from "@frostbite/shared/chain";

import { validateBitcoinAddress } from "../../src/bitcoin/address.ts";
import { createTransactionBuilder } from "../../src/bitcoin-alkanes/builder.ts";
import {
  nativeAsset,
  type ServedChain,
} from "../../src/bitcoin-alkanes/chains.ts";
import { fromHex } from "../../src/bitcoin-alkanes/node/hex.ts";
import { fakeNode } from "./nodes.ts";
import { chain, family, idA, options, utxo, wallet } from "./claims.ts";

export const treasury = {
  chain,
  value: "bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0",
};
export const friend = {
  chain,
  value: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
};
export const scriptOf = (address: { readonly value: string }) => {
  const checked = validateBitcoinAddress(address.value, "mainnet");
  if (!checked.ok) throw new Error("the test address is not valid");
  return [...fromHex(checked.value.scriptHex)];
};
export const sats = (baseUnits: bigint) => ({
  asset: nativeAsset(chain),
  baseUnits,
});
export const batch = (
  payments: readonly { recipient: typeof friend; amount: bigint }[],
  over: object = {},
): TransactionIntent => ({
  chain,
  operation: "pay-batch",
  payments: payments.map(({ amount, recipient }) => ({
    amount: sats(amount),
    recipient,
  })),
  sender: wallet,
  ...over,
});
export const standard = batch([
  { amount: 20_000n, recipient: friend },
  { amount: 30_000n, recipient: treasury },
]);
export const funding = (maxFee = 10_000n): FundingPolicy => ({
  maxFee: { asset: nativeAsset(chain), baseUnits: maxFee },
});
export const builderWith = (
  coins: ReturnType<typeof utxo>[],
  network = "mainnet",
) =>
  createTransactionBuilder(
    new Map<typeof chain, ServedChain>([
      [
        chain,
        {
          network: network as ServedChain["network"],
          node: fakeNode({
            feeRate: () => Promise.resolve(2),
            utxos: () => Promise.resolve(coins),
          }),
        },
      ],
    ]),
    options,
    family,
  );
export const rich = () => builderWith([utxo(idA, 0, 100_000n)]);
export const built = () => rich().build(standard, funding());
export const outputsOf = (unsigned: UnsignedTransaction) =>
  Psbt.fromBase64(unsigned.payload).txOutputs.map(({ script, value }) => [
    value,
    [...script],
  ]);

// The same transaction with its outputs rewritten: what a dishonest or careless signer might hand back in place of the batch built.
export function withOutputs(
  unsigned: UnsignedTransaction,
  rewrite: (
    outputs: readonly { script: Uint8Array; value: bigint }[],
  ) => readonly {
    script: Uint8Array;
    value: bigint;
  }[],
): UnsignedTransaction {
  const psbt = Psbt.fromBase64(unsigned.payload);
  const next = new Psbt();
  psbt.txInputs.forEach((input, index) => {
    const held = psbt.data.inputs[index]?.witnessUtxo;
    if (held === undefined) throw new Error("input without its coin");
    next.addInput({
      hash: Uint8Array.from(input.hash),
      index: input.index,
      sequence: input.sequence,
      witnessUtxo: held,
    });
  });
  // Only the script and the value: the library's own outputs also carry an address, which it would take in place of a script written here.
  const plain = psbt.txOutputs.map(({ script, value }) => ({ script, value }));
  for (const output of rewrite(plain)) next.addOutput(output);
  return { ...unsigned, payload: next.toBase64() };
}

export function scriptHex(address: { readonly value: string }): string {
  const checked = validateBitcoinAddress(address.value, "mainnet");
  if (!checked.ok) throw new Error("the test address is not valid");
  return checked.value.scriptHex;
}
