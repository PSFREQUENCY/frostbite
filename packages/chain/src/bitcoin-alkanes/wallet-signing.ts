import { Psbt, Transaction } from "bitcoinjs-lib";

import { bundleFormat, decodeBundle, encodeBundle } from "./admin/bundle.ts";
import { psbtFormat } from "./format.ts";
import { psbtToBase64 } from "./psbt-text.ts";
import { addTaprootKey } from "./taproot-key.ts";
import { inputIsSigned, parse } from "./verify.ts";

// What a person's wallet is asked to sign for a built transaction, and how its answer is put back. A step is one PSBT, or a pair
// (the commit and the reveal, which is signed already except for the input that spends the game's auth token); the wallet is asked
// only for the inputs nothing has signed yet, so it never sees a request for what the platform signed itself. `walletKey` is the
// wallet's public key (hex): the taproot inputs it owns name it, as some wallets need (see `taproot-key.ts`).
export interface WalletRequest {
  // The inputs the wallet is asked to sign.
  readonly inputs: readonly number[];
  // The PSBT, base64.
  readonly psbt: string;
}

function unsignedInputs(psbt: Psbt): number[] {
  return psbt.data.inputs.flatMap((input, index) =>
    inputIsSigned(input) ? [] : [index],
  );
}

function psbtsOf(format: string, payload: string): Psbt[] | null {
  if (format === psbtFormat) {
    const single = parse(payload);
    return single === null ? null : [single];
  }
  if (format === bundleFormat) {
    const bundle = decodeBundle(payload);
    return bundle === null ? null : [bundle.commit, bundle.reveal];
  }
  return null;
}

// The PSBTs the wallet must sign, in the order they are sent, each with its unsigned inputs; null for a format this family does not
// build. A transaction with nothing left to sign has no requests.
export function walletRequests(
  format: string,
  payload: string,
  walletKey = "",
): WalletRequest[] | null {
  const psbts = psbtsOf(format, payload);
  if (psbts === null) return null;
  return psbts.flatMap((psbt) => {
    const inputs = unsignedInputs(psbt);
    if (inputs.length === 0) return [];
    addTaprootKey(psbt, inputs, walletKey);
    return [{ inputs, psbt: psbtToBase64(psbt) }];
  });
}

// The payload with the wallet's answers put in, one signed PSBT (base64) for each request, in order. Null if they do not fit what
// was asked: a different number, or one that is not a PSBT. Whether each is the transaction that was built, and whether every input
// is signed, is for the platform's own check of the signed transaction.
export function withWalletSignatures(
  format: string,
  payload: string,
  answers: readonly string[],
): string | null {
  const psbts = psbtsOf(format, payload);
  if (psbts === null) return null;
  const pending = psbts.map((psbt) => unsignedInputs(psbt).length > 0);
  if (pending.filter(Boolean).length !== answers.length) return null;
  let next = 0;
  const merged: Psbt[] = [];
  for (const [index, psbt] of psbts.entries()) {
    if (!pending[index]) {
      merged.push(psbt);
      continue;
    }
    const answer = parse(answers[next++] ?? "");
    if (answer === null) return null;
    merged.push(answer);
  }
  const [first, second] = merged;
  if (format === psbtFormat)
    return first === undefined ? null : psbtToBase64(first);
  return first === undefined || second === undefined
    ? null
    : encodeBundle({ commit: first, reveal: second });
}

// The id the network will know the PSBT's transaction by, from its inputs and outputs alone (a signature does not change it), or null
// for text that is not a PSBT. A wallet that answers a signing request with an id may have sent the transaction or may only be naming
// it; an id that is not this one is neither.
export function psbtTransactionId(psbt: string): string | null {
  const parsed = parse(psbt);
  if (parsed === null) return null;
  const transaction = new Transaction();
  transaction.version = parsed.version;
  transaction.locktime = parsed.locktime;
  for (const input of parsed.txInputs)
    transaction.addInput(input.hash, input.index, input.sequence);
  for (const output of parsed.txOutputs)
    transaction.addOutput(output.script, output.value);
  return transaction.getId();
}
