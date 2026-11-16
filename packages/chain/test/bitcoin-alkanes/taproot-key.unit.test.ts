import * as ecc from "@bitcoinerlab/secp256k1";
import { initEccLib, payments, Psbt } from "bitcoinjs-lib";
import { describe, expect, it } from "vitest";

import { psbtFormat } from "../../src/bitcoin-alkanes/format.ts";
import { psbtToBase64 } from "../../src/bitcoin-alkanes/psbt-text.ts";
import { addTaprootKey } from "../../src/bitcoin-alkanes/taproot-key.ts";
import { sameTransaction } from "../../src/bitcoin-alkanes/verify.ts";
import { walletRequests } from "../../src/bitcoin-alkanes/wallet-signing.ts";

initEccLib(ecc);

// Two keys: the wallet's, and someone else's. Any valid x-only point will do.
const walletKey = Buffer.from(ecc.pointFromScalar(Buffer.alloc(32, 7), true)!);
const otherKey = Buffer.from(ecc.pointFromScalar(Buffer.alloc(32, 9), true)!);
const walletX = walletKey.subarray(1);
const outputOf = (key: Uint8Array) =>
  payments.p2tr({ internalPubkey: key }).output!;
const hex = (bytes: Uint8Array) => Buffer.from(bytes).toString("hex");

function psbtWith(scripts: Uint8Array[]): Psbt {
  const psbt = new Psbt();
  scripts.forEach((script, index) => {
    psbt.addInput({
      hash: Buffer.alloc(32, index + 1),
      index: 0,
      witnessUtxo: { script, value: 10_000n },
    });
  });
  psbt.addOutput({ script: scripts[0] ?? outputOf(walletX), value: 5_000n });
  return psbt;
}

describe("naming the wallet's key on the taproot inputs it owns", () => {
  it("names it on an input whose script that key makes, given x-only or compressed", () => {
    for (const given of [hex(walletX), hex(walletKey)]) {
      const psbt = psbtWith([outputOf(walletX)]);
      addTaprootKey(psbt, [0], given);
      expect(hex(psbt.data.inputs[0]?.tapInternalKey ?? new Uint8Array())).toBe(
        hex(walletX),
      );
    }
  });

  it("names it only on the inputs it is asked for, and leaves one that already names a key as it was", () => {
    const psbt = psbtWith([outputOf(walletX), outputOf(walletX)]);
    psbt.updateInput(1, { tapInternalKey: otherKey.subarray(1) });
    addTaprootKey(psbt, [1], hex(walletX));
    expect(hex(psbt.data.inputs[1]?.tapInternalKey ?? new Uint8Array())).toBe(
      hex(otherKey.subarray(1)),
    );
    // Input 0 was not asked for.
    expect(psbt.data.inputs[0]?.tapInternalKey).toBeUndefined();
  });

  it("leaves a non-taproot input alone, and names no key for a key that is not one", () => {
    const segwit = payments.p2wpkh({ pubkey: walletKey }).output!;
    const psbt = psbtWith([segwit, outputOf(walletX)]);
    addTaprootKey(psbt, [0, 1], hex(walletX));
    expect(psbt.data.inputs[0]?.tapInternalKey).toBeUndefined();
    for (const bad of ["", "zz", "abcd", hex(walletX) + "00"]) {
      const fresh = psbtWith([outputOf(walletX)]);
      addTaprootKey(fresh, [0], bad);
      expect(fresh.data.inputs[0]?.tapInternalKey).toBeUndefined();
    }
  });

  it("is what a wallet is sent: the request carries the key, and the transaction is the same one", () => {
    const psbt = psbtWith([outputOf(walletX)]);
    const payload = psbtToBase64(psbt);
    const [without] = walletRequests(psbtFormat, payload) ?? [];
    const [withKey] = walletRequests(psbtFormat, payload, hex(walletX)) ?? [];
    expect(
      Psbt.fromBase64(without?.psbt ?? "").data.inputs[0],
    ).not.toHaveProperty("tapInternalKey");
    const sent = Psbt.fromBase64(withKey?.psbt ?? "");
    expect(hex(sent.data.inputs[0]?.tapInternalKey ?? new Uint8Array())).toBe(
      hex(walletX),
    );
    expect(sameTransaction(sent, psbt)).toBe(true);
  });
});
