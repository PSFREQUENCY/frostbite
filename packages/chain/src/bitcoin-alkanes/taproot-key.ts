import { initEccLib, payments, type Psbt } from "bitcoinjs-lib";
import * as ecc from "@bitcoinerlab/secp256k1";

import { fromHex } from "./node/hex.ts";

// Some wallets (Xverse) sign a taproot input only when the PSBT names the key it is spent with (`tapInternalKey`); others (UniSat) find
// it from their own account. The platform builds an input from an address, which holds the tweaked key, so the wallet's own key is put in
// afterwards, and only on an input whose script that key really makes. It is not part of the transaction, so nothing that is checked
// about the built transaction changes.
const xOnlyLength = 32;
const compressedLength = 33;

// The wallet reports its key as hex, x-only (32 bytes) or compressed (33). Anything else names no key.
function xOnlyKey(keyHex: string): Uint8Array | null {
  if (!/^(?:[0-9a-f]{2})+$/iu.test(keyHex)) return null;
  const key = fromHex(keyHex);
  if (key.length === xOnlyLength) return key;
  return key.length === compressedLength ? key.slice(1) : null;
}

export function addTaprootKey(
  psbt: Psbt,
  inputs: readonly number[],
  keyHex: string,
): void {
  const internalPubkey = xOnlyKey(keyHex);
  if (internalPubkey === null) return;
  initEccLib(ecc);
  let output: Uint8Array | undefined;
  try {
    output = payments.p2tr({ internalPubkey }).output;
  } catch {
    return;
  }
  if (output === undefined) return;
  for (const index of inputs) {
    const input = psbt.data.inputs[index];
    const script = input?.witnessUtxo?.script;
    if (
      input === undefined ||
      script === undefined ||
      input.tapInternalKey !== undefined ||
      script.length !== output.length ||
      !script.every((byte, at) => byte === output[at])
    )
      continue;
    psbt.updateInput(index, { tapInternalKey: internalPubkey });
  }
}
