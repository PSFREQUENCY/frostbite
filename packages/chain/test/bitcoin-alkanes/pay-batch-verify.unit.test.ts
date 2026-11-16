import { describe, expect, it } from "vitest";
import type { UnsignedTransaction } from "@frostbite/shared/chain";

import { fromHex } from "../../src/bitcoin-alkanes/node/hex.ts";
import { sign, tamper } from "../support/claims.ts";
import {
  built,
  rich,
  sats,
  scriptHex,
  treasury,
  withOutputs,
} from "../support/pay-batch.ts";

describe("checking what was signed is the batch that was shown", () => {
  it("accepts the batch as built once every input is signed", async () => {
    const unsigned = await built();
    expect(rich().verifySigned(unsigned, sign(unsigned))).toEqual({ ok: true });
  });

  it("refuses a batch no one has signed", async () => {
    const unsigned = await built();
    expect(
      rich().verifySigned(unsigned, {
        ...sign(unsigned),
        payload: unsigned.payload,
      }),
    ).toEqual({ ok: false, reason: "signature-invalid" });
  });

  it("refuses a signed transaction that is not the one that was built", async () => {
    const unsigned = await built();
    expect(rich().verifySigned(unsigned, tamper(sign(unsigned)))).toEqual({
      ok: false,
      reason: "payload-mismatch",
    });
  });

  it("refuses a transaction that does not do what its summary says: a changed amount, a changed person, an extra payee, or a different fee", async () => {
    const unsigned = await built();
    const withSummary = (summary: UnsignedTransaction["summary"]) => ({
      ...unsigned,
      summary,
    });
    const shown = unsigned.summary.payments ?? [];
    const first = shown[0];
    const second = shown[1];
    if (first === undefined || second === undefined)
      throw new Error("the batch has two payments");
    const signed = sign(unsigned);
    const refused = { ok: false, reason: "summary-mismatch" } as const;
    expect(
      rich().verifySigned(
        withSummary({
          ...unsigned.summary,
          payments: [{ ...first, amount: sats(20_001n) }, second],
        }),
        signed,
      ),
    ).toEqual(refused);
    expect(
      rich().verifySigned(
        withSummary({
          ...unsigned.summary,
          payments: [{ ...first, recipient: treasury }, second],
        }),
        signed,
      ),
    ).toEqual(refused);
    expect(
      rich().verifySigned(
        withSummary({ ...unsigned.summary, payments: [first] }),
        signed,
      ),
    ).toEqual(refused);
    expect(
      rich().verifySigned(
        withSummary({ ...unsigned.summary, fee: sats(1n) }),
        signed,
      ),
    ).toEqual(refused);
    expect(
      rich().verifySigned(
        withSummary({ ...unsigned.summary, payments: undefined }),
        signed,
      ),
    ).toEqual(refused);
  });

  it("refuses a batch whose change goes anywhere but back to the wallet that owns the inputs", async () => {
    const unsigned = await built();
    const altered = withOutputs(unsigned, (outputs) =>
      outputs.map((output, index) =>
        index === 2
          ? { ...output, script: Uint8Array.from(fromHex(scriptHex(treasury))) }
          : output,
      ),
    );
    expect(rich().verifySigned(altered, sign(altered))).toEqual({
      ok: false,
      reason: "summary-mismatch",
    });
  });

  it("refuses a batch whose change is split: after the payments there is one change output at most", async () => {
    const unsigned = await built();
    const altered = withOutputs(unsigned, (outputs) => {
      const [first, second, change] = outputs;
      if (first === undefined || second === undefined || change === undefined)
        throw new Error("the batch has two payments and a change");
      return [
        first,
        second,
        { ...change, value: change.value - 1n },
        { ...change, value: 1n },
      ];
    });
    expect(rich().verifySigned(altered, sign(altered))).toEqual({
      ok: false,
      reason: "summary-mismatch",
    });
  });
});
