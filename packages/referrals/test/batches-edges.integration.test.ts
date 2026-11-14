import { randomUUID } from "node:crypto";

import { BuildRefusedError } from "@frostbite/chain/ports";
import { maxAdminPayloadChars } from "@frostbite/shared/games";
import { describe, expect, it } from "vitest";

import { createBatchRepository } from "../src/batches/repository.ts";
import { createBatches } from "../src/batches/service.ts";
import {
  clearQueue,
  need,
  registerStaff,
  staff,
  treasury,
} from "./support/batch-flow.ts";
import { addressOf, ports, waitingPayout } from "./support/batches.ts";
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

type Ports = typeof ports;
// The service over the simulated chain with one part of it changed: what a failing network or builder looks like to it.
const servedWith = (change: (served: Ports) => Ports) =>
  createBatches({
    clock: () => clock.now,
    delay: { maxUnsettledMs: 3_600_000 },
    funding: () => ({
      maxFee: { asset: { chain, id: "sim", kind: "native" }, baseUnits: 10n },
    }),
    newId: randomUUID,
    ports: () => change(ports),
    repository: createBatchRepository(database, { clock: () => clock.now }),
    rewards: referrals.rewards,
  });
const ask = (service: ReturnType<typeof servedWith>, over: object = {}) =>
  service.start({
    assetKey: feeAsset,
    sender: treasury,
    staffId: staff.id,
    ...over,
  });
const buildingWith = (build: Ports["builder"]["build"]) =>
  servedWith((served) => ({
    ...served,
    builder: { ...served.builder, build },
  }));

describe("a batch that cannot be built", () => {
  it("says why when the builder refuses, and only that it could not when it fails some other way, leaving the payouts waiting", async () => {
    await clearQueue();
    await waitingPayout(10_000n, addressOf("0a0b0c"));
    expect(
      await ask(
        buildingWith(async () => {
          throw new BuildRefusedError("insufficient-funds", "no coins");
        }),
      ),
    ).toMatchObject({
      code: "could-not-build",
      ok: false,
      reason: "insufficient-funds",
    });
    expect(
      await ask(
        buildingWith(async () => {
          throw new Error("the node fell over");
        }),
      ),
    ).toMatchObject({ code: "could-not-build", ok: false, reason: undefined });
  });

  it("refuses a transaction too large to keep, and builds nothing from it", async () => {
    await clearQueue();
    const waiting = await waitingPayout(10_000n, addressOf("0a0b0c"));
    const answer = await ask(
      buildingWith(async (intent, funding) => ({
        ...(await ports.builder.build(intent, funding)),
        payload: "x".repeat(maxAdminPayloadChars + 1),
      })),
    );
    expect(answer).toMatchObject({
      code: "could-not-build",
      ok: false,
      reason: "payload-too-large",
    });
    expect(
      (await referrals.rewards.payouts.payout(waiting.payout.id))?.state,
    ).toBe("requested");
  });

  it("says the network is unavailable when the paying address cannot be read for a reason that is not the address", async () => {
    await clearQueue();
    await waitingPayout(10_000n, addressOf("0a0b0c"));
    const answer = await ask(
      servedWith((served) => ({
        ...served,
        addressCodec: {
          ...served.addressCodec,
          parse: () => {
            throw new Error("the codec could not be asked");
          },
        },
      })),
    );
    expect(answer).toMatchObject({ code: "chain-unavailable", ok: false });
  });
});

describe("a batch of the payouts that were named", () => {
  it("pays only those, and leaves the rest waiting for the next", async () => {
    await clearQueue();
    const first = await waitingPayout(10_000n, addressOf("0a0b0c"));
    const second = await waitingPayout(10_000n, addressOf("0d0e0f"));
    const answer = await need(
      ask(
        servedWith((served) => served),
        { payoutIds: [second.payout.id] },
      ),
    );
    expect(answer.batch.payoutIds).toEqual([second.payout.id]);
    expect(
      (await referrals.rewards.payouts.payout(first.payout.id))?.state,
    ).toBe("requested");
  });
});
