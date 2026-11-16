import { Psbt } from "bitcoinjs-lib";
import type {
  ChainRef,
  TransactionIntent,
  UnsignedTransaction,
} from "@frostbite/shared/chain";

import { dustLimitSats } from "../bitcoin/dust.ts";
import { validateBitcoinAddress } from "../bitcoin/address.ts";
import { BuildRefusedError } from "./build-refused.ts";
import { nativeAsset, servedChain, type ServedChain } from "./chains.ts";
import { psbtFormat } from "./format.ts";
import { fromHex } from "./node/hex.ts";
import {
  feeDetailFor,
  feeTargetFor,
  type TransactionOptions,
} from "./options.ts";
import { psbtToBase64 } from "./psbt-text.ts";
import { type ScriptKind, estimateVsize } from "./tx/fees.ts";
import {
  selectCoins,
  shortfallNote,
  unconfirmedNote,
  type CoinRequest,
} from "./tx/coins.ts";
import { buildPayBatchPsbt } from "./tx/pay-batch-psbt.ts";
import { maxStandardVirtualBytes } from "./tx/standardness.ts";
import { sameBytes } from "./verify.ts";

type PayBatchIntent = Extract<TransactionIntent, { operation: "pay-batch" }>;

interface Destination {
  readonly kind: ScriptKind;
  readonly sats: bigint;
  readonly script: Uint8Array;
}

// Where each payment goes and what it carries, checked on the chain's network: an address of a kind this adapter sizes, in the chain's own
// coin, and not dust (an output the network would not relay would stop the whole batch).
function destinationsOf(
  intent: PayBatchIntent,
  network: ServedChain["network"],
): readonly Destination[] {
  const coin = nativeAsset(intent.chain);
  return intent.payments.map(({ amount, recipient }, at) => {
    const checked = validateBitcoinAddress(recipient.value, network);
    if (
      !checked.ok ||
      amount.asset.kind !== coin.kind ||
      amount.asset.id !== coin.id
    ) {
      throw new BuildRefusedError(
        "invalid-request",
        `Payment ${String(at + 1)} is not to an address on this network, in its coin.`,
      );
    }
    if (amount.baseUnits < dustLimitSats(checked.value.type)) {
      throw new BuildRefusedError(
        "invalid-request",
        `Payment ${String(at + 1)} is below what the network relays as an output to that address.`,
      );
    }
    return {
      kind: checked.value.type,
      sats: amount.baseUnits,
      script: fromHex(checked.value.scriptHex),
    };
  });
}

// One transaction that pays everyone in the batch: the sender's coins pay the sum and the network fee, and what is left comes back to the
// sender. Built, never signed: the person who pays signs what they were shown.
export async function buildPayBatch(
  intent: PayBatchIntent,
  context: {
    readonly chains: ReadonlyMap<ChainRef, ServedChain>;
    readonly family: UnsignedTransaction["family"];
    readonly options: TransactionOptions;
  },
  funding: { readonly maxFee: { readonly baseUnits: bigint } },
): Promise<UnsignedTransaction> {
  const { chains, family, options } = context;
  const { network, node } = servedChain(chains, intent.chain);
  const sender = validateBitcoinAddress(intent.sender.value, network);
  if (!sender.ok) {
    throw new BuildRefusedError(
      "invalid-request",
      "The paying wallet is not an address on this network.",
    );
  }
  const destinations = destinationsOf(intent, network);
  const feeRate = await node.feeRate(feeTargetFor(options, intent.feeSpeed));
  const request: CoinRequest = {
    changeDustSats: options.changeDustSats,
    feeRate,
    fixedOutputs: destinations.map(({ kind }) => kind),
    fixedSats: destinations.reduce((sum, { sats }) => sum + sats, 0n),
    kind: sender.value.type,
    opReturnScriptLength: null,
    utxos: await node.utxos(sender.value.address),
  };
  const selection = selectCoins(request);
  if (selection === null) {
    throw new BuildRefusedError(
      "insufficient-funds",
      `The paying wallet's confirmed balance cannot pay this batch and its fee${shortfallNote(request)}${unconfirmedNote(request.utxos)}`,
    );
  }
  if (selection.fee > funding.maxFee.baseUnits) {
    throw new BuildRefusedError(
      "fee-above-limit",
      `The fee would be ${selection.fee} sats, above the ${funding.maxFee.baseUnits} the platform allows for one step. Choose a slower speed.`,
    );
  }
  const size = estimateVsize(
    selection.chosen.map(() => sender.value.type),
    [
      ...request.fixedOutputs,
      ...(selection.change > 0n ? [sender.value.type] : []),
    ],
    null,
  );
  if (size > maxStandardVirtualBytes) {
    throw new BuildRefusedError(
      "invalid-request",
      "The wallet holds too many small coins to pay this batch in one transaction the network relays. Consolidate them, or pay a smaller batch.",
    );
  }
  const psbt = buildPayBatchPsbt({
    changeSats: selection.change,
    inputs: selection.chosen,
    payments: destinations,
    senderScript: fromHex(sender.value.scriptHex),
  });
  return {
    chain: intent.chain,
    family,
    format: psbtFormat,
    payload: psbtToBase64(psbt),
    summary: {
      chain: intent.chain,
      expiresAt: new Date(
        options.now().getTime() + options.lifetimeMs,
      ).toISOString(),
      fee: { asset: nativeAsset(intent.chain), baseUnits: selection.fee },
      feeDetail: feeDetailFor(options, intent.feeSpeed, feeRate),
      operation: "pay-batch",
      payments: intent.payments,
    },
  };
}

// What the person was shown must be what the transaction does: each payment goes to its address for its amount, in order; after them there
// is at most one output, back to the wallet that owns the inputs; and the network fee is the stated fee.
export function payBatchMatchesSummary(
  unsigned: UnsignedTransaction,
  psbt: Psbt,
  chains: ReadonlyMap<ChainRef, ServedChain>,
): boolean {
  const { payments } = unsigned.summary;
  if (unsigned.summary.operation !== "pay-batch" || payments === undefined)
    return false;
  const { network } = servedChain(chains, unsigned.chain);
  const outputs = psbt.txOutputs;
  const owners = psbt.data.inputs.map((input) => input.witnessUtxo?.script);
  const [owner] = owners;
  if (
    owner === undefined ||
    owners.some((script) => script === undefined || !sameBytes(script, owner))
  )
    return false;
  const paidAsShown = payments.every(({ amount, recipient }, at) => {
    const address = validateBitcoinAddress(recipient.value, network);
    const output = outputs[at];
    return (
      address.ok &&
      output !== undefined &&
      output.value === amount.baseUnits &&
      sameBytes(output.script, fromHex(address.value.scriptHex))
    );
  });
  const rest = outputs.slice(payments.length);
  const paid = psbt.data.inputs.reduce(
    (sum, input) => sum + (input.witnessUtxo?.value ?? 0n),
    0n,
  );
  const spent = outputs.reduce((sum, output) => sum + output.value, 0n);
  return (
    paidAsShown &&
    rest.length <= 1 &&
    rest.every((output) => sameBytes(output.script, owner)) &&
    paid - spent === unsigned.summary.fee.baseUnits
  );
}
