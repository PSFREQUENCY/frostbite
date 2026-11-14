import { describe, expect, it } from "vitest";

import { createCover } from "../src/batches/cover.ts";
import { clearQueue, treasury } from "./support/batch-flow.ts";
import { addressOf, ports, waitingPayout } from "./support/batches.ts";
import {
  chain,
  feeAsset,
  referrals,
  registerDatabase,
} from "./support/fixture.ts";

registerDatabase();

const coverWith = (change: (served: typeof ports) => typeof ports = (x) => x) =>
  createCover({
    ports: (on) => (on === chain ? change(ports) : null),
    rewards: referrals.rewards,
  });

describe("what a paying wallet holds against what is waiting", () => {
  it("reads what the wallet can spend and what waits for its first confirmation, and what the waiting payouts add up to, changing nothing", async () => {
    await clearQueue();
    const first = await waitingPayout(10_000n, addressOf("0a0b0c"));
    const second = await waitingPayout(20_000n, addressOf("0d0e0f"));
    const answer = await coverWith()({
      assetKey: feeAsset,
      wallet: treasury,
    });
    expect(answer).toMatchObject({ ok: true, payments: 2, pendingUnits: 0n });
    if (!answer.ok) throw new Error("expected a reading");
    expect(answer.heldUnits).toBeGreaterThan(0n);
    expect(answer.waitingUnits).toBe(
      first.payout.amount + second.payout.amount,
    );
    expect(
      (await referrals.rewards.payouts.payout(first.payout.id))?.state,
    ).toBe("requested");
  });

  it("says nothing waits when nothing does, and what a wallet with nothing holds", async () => {
    await clearQueue();
    expect(
      await coverWith()({ assetKey: feeAsset, wallet: addressOf("ffffff") }),
    ).toMatchObject({ heldUnits: 0n, ok: true, payments: 0, waitingUnits: 0n });
  });

  it("refuses an address that is not one, a chain that is not served, and a network that cannot be asked", async () => {
    expect(await coverWith()({ assetKey: feeAsset, wallet: "nobody" })).toEqual(
      { ok: false, reason: "invalid-wallet" },
    );
    expect(
      await coverWith()({
        assetKey: "simnet:two/native/sim",
        wallet: treasury,
      }),
    ).toEqual({ ok: false, reason: "chain-unavailable" });
    expect(
      await coverWith()({ assetKey: "garbage", wallet: treasury }),
    ).toEqual({ ok: false, reason: "chain-unavailable" });
    expect(
      await coverWith((served) => ({
        ...served,
        observer: {
          ...served.observer,
          balance: async () => {
            throw new Error("the node is down");
          },
        },
      }))({ assetKey: feeAsset, wallet: treasury }),
    ).toEqual({ ok: false, reason: "chain-unavailable" });
    expect(
      await coverWith((served) => ({
        ...served,
        addressCodec: {
          ...served.addressCodec,
          parse: () => {
            throw new Error("the codec could not be asked");
          },
        },
      }))({ assetKey: feeAsset, wallet: treasury }),
    ).toEqual({ ok: false, reason: "chain-unavailable" });
  });
});
