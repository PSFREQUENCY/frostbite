import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { createBatchRepository } from "../src/batches/repository.ts";
import { createBatches } from "../src/batches/service.ts";
import {
  clearQueue,
  need,
  registerStaff,
  staff,
  start,
  stateOf,
  treasury,
} from "./support/batch-flow.ts";
import { addressOf, batches, ports, waitingPayout } from "./support/batches.ts";
import {
  chain,
  clock,
  database,
  feeAsset,
  referrals,
  registerDatabase,
} from "./support/fixture.ts";

registerDatabase();
registerStaff();

describe("paying referrers in a batch: what is left out and what is refused", () => {
  it("leaves out a payout under what the network would relay or to an address it does not accept, and says which, paying the rest", async () => {
    await clearQueue();
    const small = await waitingPayout(100n, addressOf("0a0b0c"));
    const odd = await waitingPayout(10_000n, "not-an-address");
    const fine = await waitingPayout(10_000n, addressOf("0d0e0f"));
    const answer = await need(start());
    expect(answer.batch.payoutIds).toEqual([fine.payout.id]);
    const byReason = (
      list: readonly { readonly payoutId: string; readonly reason: string }[],
    ) => [...list].sort((x, y) => x.reason.localeCompare(y.reason));
    expect(byReason(answer.skipped)).toEqual(
      byReason([
        { payoutId: small.payout.id, reason: "dust" },
        { payoutId: odd.payout.id, reason: "invalid-address" },
      ]),
    );
  });

  it("refuses to build when nothing is waiting, the sender is not an address, the chain is not served, or the sender cannot pay", async () => {
    await clearQueue();
    expect(await start()).toMatchObject({ code: "nothing-to-pay", ok: false });
    await waitingPayout(10_000n, addressOf("0a0b0c"));
    expect(await start({ sender: "nobody" })).toMatchObject({
      code: "invalid-sender",
      ok: false,
    });
    expect(await start({ assetKey: "simnet:two/native/sim" })).toMatchObject({
      code: "chain-unavailable",
      ok: false,
    });
    expect(await start({ assetKey: "garbage" })).toMatchObject({
      code: "chain-unavailable",
      ok: false,
    });
    expect(await start({ sender: addressOf("ffffff") })).toMatchObject({
      code: "cannot-pay",
      ok: false,
    });
  });

  it("refuses a batch that would cost more in network fee than it pays, stores nothing, and leaves the payouts waiting", async () => {
    await clearQueue();
    const waiting = await waitingPayout(10_000n, addressOf("0a0b0c"));
    const costly = createBatches({
      clock: () => clock.now,
      delay: { maxUnsettledMs: 3_600_000 },
      funding: () => ({
        maxFee: {
          asset: { chain, id: "sim", kind: "native" },
          baseUnits: 10n,
        },
      }),
      newId: randomUUID,
      ports: () => ({
        ...ports,
        builder: {
          ...ports.builder,
          build: async (intent, funding) => {
            const built = await ports.builder.build(intent, funding);
            return {
              ...built,
              summary: {
                ...built.summary,
                fee: { ...built.summary.fee, baseUnits: 1_000_000n },
              },
            };
          },
        },
      }),
      repository: createBatchRepository(database, { clock: () => clock.now }),
      rewards: referrals.rewards,
    });
    expect(
      await costly.start({
        assetKey: feeAsset,
        sender: treasury,
        staffId: staff.id,
      }),
    ).toMatchObject({ code: "costs-more-than-it-pays", ok: false });
    expect(await stateOf(waiting.payout.id)).toBe("requested");
    expect(
      (await batches.list(50)).some(({ payoutIds }) =>
        payoutIds.includes(waiting.payout.id),
      ),
    ).toBe(false);
  });
});
