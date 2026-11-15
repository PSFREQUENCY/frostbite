import { describe, expect, it } from "vitest";

import { psbtTransactionId } from "../src/bridge/psbt-id.ts";

// Two PSBTs and the ids `bitcoinjs-lib` gives their transactions (made once with the library, so this checks the reader against it):
// one input and one output, and three inputs and ten outputs, whose unsigned transaction is 443 bytes, long enough to need the
// two-byte length of a PSBT's key-value pair.
const small = {
  id: "141be641d2ee90803ed9b47dfc7a6518aaade5e5dfcbb127648db839cab282ee",
  psbt: "cHNidP8BAFICAAAAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAAAAAAD/////AegDAAAAAAAAFgAUEREREREREREREREREREREREREREAAAAAAAAA",
};
const big = {
  id: "816532b28fa86cf5127baee54b4777180b7c84d76a2aeddbd157ebe75712b8f5",
  psbt: "cHNidP8BAP27AQIAAAADAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEAAAAAAP////8CAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgEAAAAA/////wMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAgAAAAD/////CugDAAAAAAAAFgAUERERERERERERERERERERERERERHpAwAAAAAAABYAFBERERERERERERERERERERERERER6gMAAAAAAAAWABQREREREREREREREREREREREREREesDAAAAAAAAFgAUERERERERERERERERERERERERERHsAwAAAAAAABYAFBERERERERERERERERERERERERER7QMAAAAAAAAWABQREREREREREREREREREREREREREe4DAAAAAAAAFgAUERERERERERERERERERERERERERHvAwAAAAAAABYAFBERERERERERERERERERERERERER8AMAAAAAAAAWABQREREREREREREREREREREREREREfEDAAAAAAAAFgAUEREREREREREREREREREREREREREAAAAAAAEBKyBOAAAAAAAAIlEgq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6sAAQErIE4AAAAAAAAiUSCrq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urqwABASsgTgAAAAAAACJRIKurq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urAAAAAAAAAAAAAAA=",
};

const bytesOf = (base64: string) =>
  Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
const base64Of = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));

describe("the id of the transaction a PSBT holds", () => {
  it("is the id the network knows the transaction by, for a short one and for one long enough to need a two-byte length", async () => {
    expect(await psbtTransactionId(small.psbt)).toBe(small.id);
    expect(await psbtTransactionId(big.psbt)).toBe(big.id);
  });

  it("says nothing for what is not a PSBT, or one it cannot read the transaction of", async () => {
    expect(await psbtTransactionId("not base64 !")).toBeNull();
    expect(await psbtTransactionId("")).toBeNull();
    // Right words, wrong magic.
    const wrongMagic = bytesOf(small.psbt);
    wrongMagic[0] = 0x71;
    expect(await psbtTransactionId(base64Of(wrongMagic))).toBeNull();
    // Cut short in the middle of the transaction, and right after the magic.
    expect(
      await psbtTransactionId(base64Of(bytesOf(small.psbt).slice(0, 20))),
    ).toBeNull();
    expect(
      await psbtTransactionId(base64Of(bytesOf(small.psbt).slice(0, 5))),
    ).toBeNull();
    // A global map that ends (a zero-length key) before any unsigned transaction.
    const noTransaction = Uint8Array.from([0x70, 0x73, 0x62, 0x74, 0xff, 0x00]);
    expect(await psbtTransactionId(base64Of(noTransaction))).toBeNull();
  });

  it("is not the id of another transaction: a changed output gives a different id", async () => {
    const changed = bytesOf(small.psbt);
    // A byte inside the unsigned transaction (it starts after the magic and the first key and length).
    changed[40] = (changed[40] ?? 0) ^ 0x01;
    const id = await psbtTransactionId(base64Of(changed));
    expect(id).not.toBe(small.id);
    expect(id).toMatch(/^[0-9a-f]{64}$/u);
  });

  describe("read by hand, so every way a length is written and every way it can run out is checked", () => {
    const magic = [0x70, 0x73, 0x62, 0x74, 0xff];
    const psbtOf = (...parts: number[][]) =>
      base64Of(Uint8Array.from([...magic, ...parts.flat()]));
    // The id of some bytes taken as a transaction, computed here with the browser's own hash.
    async function idOf(transaction: number[]) {
      const once = await crypto.subtle.digest(
        "SHA-256",
        Uint8Array.from(transaction),
      );
      const twice = await crypto.subtle.digest("SHA-256", once);
      return [...new Uint8Array(twice).reverse()]
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
    }
    const transaction = [1, 2, 3];

    it("reads lengths written in one, two and four bytes", async () => {
      const expected = await idOf(transaction);
      // key 00 and value 01 02 03, each length as one byte, as two (0xfd), and as four (0xfe).
      expect(await psbtTransactionId(psbtOf([1, 0x00, 3], transaction))).toBe(
        expected,
      );
      expect(
        await psbtTransactionId(
          psbtOf([0xfd, 1, 0, 0x00, 0xfd, 3, 0], transaction),
        ),
      ).toBe(expected);
      expect(
        await psbtTransactionId(
          psbtOf([0xfe, 1, 0, 0, 0, 0x00, 0xfe, 3, 0, 0, 0], transaction),
        ),
      ).toBe(expected);
    });

    it("skips the other keys of the global map before the unsigned transaction", async () => {
      const expected = await idOf(transaction);
      // A key 01 with a two-byte value first.
      expect(
        await psbtTransactionId(
          psbtOf([1, 0x01, 2, 9, 9], [1, 0x00, 3], transaction),
        ),
      ).toBe(expected);
    });

    it("says nothing when a length is eight bytes (no PSBT is that long), or is cut off, or says more than there is", async () => {
      expect(
        await psbtTransactionId(psbtOf([0xff, 1, 0, 0, 0, 0, 0, 0, 0, 0x00])),
      ).toBeNull();
      expect(await psbtTransactionId(psbtOf([0xfd, 1]))).toBeNull();
      // A value that says it is 200 bytes and has three.
      expect(
        await psbtTransactionId(psbtOf([1, 0x00, 200], transaction)),
      ).toBeNull();
      // A key with no value length after it.
      expect(await psbtTransactionId(psbtOf([1, 0x00]))).toBeNull();
    });
  });
});
