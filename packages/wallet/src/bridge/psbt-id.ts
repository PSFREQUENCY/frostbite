// The id the network will know a PSBT's transaction by, read from the PSBT itself: its unsigned transaction is in the global map, and a
// transaction's id is the double SHA-256 of those bytes, written backwards. A signature does not change it. Null for anything this does not
// recognise (not base64, not a PSBT, no unsigned transaction, a later PSBT version), which a caller treats as "not the id".
//
// It is written out here instead of read with a Bitcoin library because the wallet's browser bundle has a size ceiling and a PSBT library
// is most of what it would add; this needs nothing beyond the browser's own SHA-256.
const magic = [0x70, 0x73, 0x62, 0x74, 0xff];
const unsignedTransactionKey = 0x00;
const oneByteMax = 0xfc;

function readLength(
  bytes: Uint8Array,
  at: number,
): { readonly next: number; readonly value: number } | null {
  const first = bytes[at];
  if (first === undefined) return null;
  if (first <= oneByteMax) return { next: at + 1, value: first };
  const width = first === 0xfd ? 2 : first === 0xfe ? 4 : 0;
  // An eight-byte length is far longer than any PSBT this could be.
  if (width === 0 || at + 1 + width > bytes.length) return null;
  // Little-endian.
  const value = bytes
    .slice(at + 1, at + 1 + width)
    .reduceRight((total, byte) => total * 256 + byte, 0);
  return { next: at + 1 + width, value };
}

function decode(base64: string): Uint8Array | null {
  try {
    return Uint8Array.from(atob(base64), (character) =>
      character.charCodeAt(0),
    );
  } catch {
    return null;
  }
}

// The unsigned transaction of a PSBT, or null.
function unsignedTransaction(bytes: Uint8Array): Uint8Array | null {
  if (!magic.every((byte, index) => bytes[index] === byte)) return null;
  let at = magic.length;
  for (;;) {
    const keyLength = readLength(bytes, at);
    if (keyLength === null || keyLength.value === 0) return null;
    const keyEnd = keyLength.next + keyLength.value;
    const valueLength = readLength(bytes, keyEnd);
    if (valueLength === null) return null;
    const valueEnd = valueLength.next + valueLength.value;
    if (valueEnd > bytes.length) return null;
    if (
      keyLength.value === 1 &&
      bytes[keyLength.next] === unsignedTransactionKey
    )
      return bytes.slice(valueLength.next, valueEnd);
    at = valueEnd;
  }
}

async function sha256(bytes: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(
    await crypto.subtle.digest("SHA-256", new Uint8Array(bytes)),
  );
}

export async function psbtTransactionId(
  base64: string,
): Promise<string | null> {
  const bytes = decode(base64);
  const transaction = bytes === null ? null : unsignedTransaction(bytes);
  if (transaction === null) return null;
  const hash = await sha256(await sha256(transaction));
  return [...hash.reverse()]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
