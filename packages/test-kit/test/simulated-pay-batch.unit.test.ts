import { describe, expect, it } from "vitest";

import { signSimulated } from "../src/simulated-chain/transaction.ts";
import { funding, simulatedPorts } from "./support/chains.ts";

describe("a batch payment on the simulated chain", () => {
  it("shows every payment, in order, and a signature for it verifies", async () => {
    const { batchIntent, need } = simulatedPorts();
    const builder = need("builder");
    const unsigned = await builder.build(batchIntent, funding);
    expect(unsigned.summary.payments).toEqual(
      batchIntent.operation === "pay-batch" ? batchIntent.payments : [],
    );
    expect(builder.verifySigned(unsigned, signSimulated(unsigned))).toEqual({
      ok: true,
    });
  });

  it("is refused when a payment in what was signed is not the one that was shown", async () => {
    const { batchIntent, need } = simulatedPorts();
    const builder = need("builder");
    const unsigned = await builder.build(batchIntent, funding);
    const forged = { ...signSimulated(unsigned) };
    forged.payload = forged.payload.replace(/:5"/u, ':500"');
    expect(forged.payload).not.toBe(signSimulated(unsigned).payload);
    expect(builder.verifySigned(unsigned, forged)).toMatchObject({
      ok: false,
    });
  });

  it("is judged by the sum of its payments and the fee against what the sender holds", async () => {
    const { batchIntent, need, sender } = simulatedPorts();
    const simulate = need("contracts").simulate;
    expect(await simulate(batchIntent)).toMatchObject({ ok: true });
    const poor = {
      ...batchIntent,
      sender: { ...sender, value: "sim:one:ffffff" },
    };
    expect(await simulate(poor)).toEqual({
      ok: false,
      reason: "insufficient balance",
    });
  });
});
