import { describe, expect, it } from "vitest";
import type { TransactionIntent } from "@frostbite/shared/chain";

import { chain, idA, utxo, walletScript } from "../support/claims.ts";
import {
  batch,
  builderWith,
  built,
  friend,
  funding,
  outputsOf,
  rich,
  sats,
  scriptOf,
  standard,
  treasury,
} from "../support/pay-batch.ts";

describe("building a batch of payments on a bitcoin chain", () => {
  it("pays each person as shown, in order, and sends what is left back to the wallet that pays", async () => {
    const unsigned = await built();
    const fee = unsigned.summary.fee.baseUnits;
    expect(outputsOf(unsigned)).toEqual([
      [20_000n, scriptOf(friend)],
      [30_000n, scriptOf(treasury)],
      [100_000n - 50_000n - fee, [...walletScript]],
    ]);
    expect(unsigned.summary).toMatchObject({
      operation: "pay-batch",
      payments: [
        { amount: sats(20_000n), recipient: friend },
        { amount: sats(30_000n), recipient: treasury },
      ],
    });
    expect(unsigned.summary.feeDetail).toBeDefined();
    expect(fee).toBeGreaterThan(0n);
  });

  it("makes no change output when what is left would be dust, and pays it as fee", async () => {
    const unsigned = await builderWith([utxo(idA, 0, 50_400n)]).build(
      standard,
      funding(),
    );
    expect(outputsOf(unsigned)).toHaveLength(2);
    expect(unsigned.summary.fee.baseUnits).toBe(400n);
  });

  it("spends only confirmed coins, and says so when only unconfirmed ones would cover it", async () => {
    await expect(
      builderWith([utxo(idA, 0, 100_000n, false)]).build(standard, funding()),
    ).rejects.toMatchObject({
      code: "insufficient-funds",
      message: expect.stringContaining(
        "waiting for their first confirmation",
      ) as string,
    });
  });

  it("refuses a wallet that cannot cover the payments and the fee, saying by how much", async () => {
    await expect(
      builderWith([utxo(idA, 0, 50_100n)]).build(standard, funding()),
    ).rejects.toMatchObject({
      code: "insufficient-funds",
      message: expect.stringContaining("holds 50100 confirmed") as string,
    });
  });

  it("refuses a fee above what the platform allows for one step", async () => {
    await expect(rich().build(standard, funding(1n))).rejects.toMatchObject({
      code: "fee-above-limit",
    });
  });

  it("refuses a payment under the dust limit of its address, and takes exactly the limit", async () => {
    await expect(
      rich().build(batch([{ amount: 329n, recipient: treasury }]), funding()),
    ).rejects.toMatchObject({ code: "invalid-request" });
    await expect(
      rich().build(batch([{ amount: 330n, recipient: treasury }]), funding()),
    ).resolves.toBeDefined();
    await expect(
      rich().build(batch([{ amount: 293n, recipient: friend }]), funding()),
    ).rejects.toMatchObject({ code: "invalid-request" });
    await expect(
      rich().build(batch([{ amount: 294n, recipient: friend }]), funding()),
    ).resolves.toBeDefined();
  });

  it("refuses a payment to an address that is not on this network, or in a coin that is not the chain's", async () => {
    const testnet = {
      chain,
      value: "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx",
    };
    await expect(
      rich().build(batch([{ amount: 1_000n, recipient: testnet }]), funding()),
    ).rejects.toMatchObject({ code: "invalid-request" });
    const foreign = {
      ...batch([{ amount: 1_000n, recipient: friend }]),
      payments: [
        {
          amount: {
            asset: { chain, id: "rune", kind: "native" as const },
            baseUnits: 1_000n,
          },
          recipient: friend,
        },
      ],
    } as TransactionIntent;
    await expect(rich().build(foreign, funding())).rejects.toMatchObject({
      code: "invalid-request",
    });
  });

  it("refuses a paying wallet that is not an address on this network", async () => {
    await expect(
      rich().build(
        batch([{ amount: 1_000n, recipient: friend }], {
          sender: { chain, value: "nobody" },
        }),
        funding(),
      ),
    ).rejects.toMatchObject({ code: "invalid-request" });
  });

  it("refuses a batch that would need more small coins than one transaction the network relays can hold", async () => {
    const dust = Array.from({ length: 3_000 }, (_value, vout) =>
      utxo(idA, vout, 200n),
    );
    await expect(
      builderWith(dust).build(
        batch([{ amount: 100_000n, recipient: friend }]),
        funding(10_000_000n),
      ),
    ).rejects.toMatchObject({
      code: "invalid-request",
      message: expect.stringContaining("too many small coins") as string,
    });
  });

  it("is priced at the speed chosen", async () => {
    const slow = await rich().build(
      { ...standard, feeSpeed: "slow" } as TransactionIntent,
      funding(),
    );
    expect(slow.summary.feeDetail).toMatchObject({ speed: "slow" });
  });
});
