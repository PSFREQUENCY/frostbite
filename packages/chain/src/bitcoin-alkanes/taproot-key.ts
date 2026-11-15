import type { Psbt } from "bitcoinjs-lib";

import { fromHex } from "./node/hex.ts";

// Some wallets (Xverse) sign a taproot input only when the PSBT names the key it is spent with (`tapInternalKey`); others (UniSat) find
// it from their own account. The platform builds an input from an address, which holds the tweaked key, so the wallet's own key is put in
// afterwards. It goes only on the inputs the wallet is being asked to sign, which are the ones nobody has signed: the platform signs its
// own, so every input left is the wallet's. It is not part of the transaction, so nothing that is checked about the built transaction
// changes. A wallet that is handed a key that is not its input's simply signs nothing, as it would have without one.
const xOnlyLength = 32;
const compressedLength = 33;
// A taproot output script is `OP_1` then a 32-byte push.
const taprootScriptLength = 34;
const opOne = 0x51;
const pushThirtyTwo = 0x20;

// The wallet reports its key as hex, x-only (32 bytes) or compressed (33). Anything else names no key.
function xOnlyKey(keyHex: string): Uint8Array | null {
  if (!/^(?:[0-9a-f]{2})+$/iu.test(keyHex)) return null;
  const key = fromHex(keyHex);
  if (key.length === xOnlyLength) return key;
  // A compressed key starts with 02 or 03.
  return key.length === compressedLength && (key[0] === 2 || key[0] === 3)
    ? key.slice(1)
    : null;
}

const isTaproot = (script: Uint8Array): boolean =>
  script.length === taprootScriptLength &&
  script[0] === opOne &&
  script[1] === pushThirtyTwo;

export function addTaprootKey(
  psbt: Psbt,
  inputs: readonly number[],
  keyHex: string,
): void {
  const internalKey = xOnlyKey(keyHex);
  if (internalKey === null) return;
  for (const index of inputs) {
    const input = psbt.data.inputs[index];
    const script = input?.witnessUtxo?.script;
    if (
      input === undefined ||
      script === undefined ||
      input.tapInternalKey !== undefined ||
      !isTaproot(script)
    )
      continue;
    psbt.updateInput(index, { tapInternalKey: internalKey });
  }
}
