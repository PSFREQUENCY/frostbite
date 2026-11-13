import { describe, expect, it } from "vitest";

import {
  advance,
  freshProgram,
  registerDatabase,
  rewards,
  saleEvent,
  sats,
  seedUser,
  startProgram,
} from "./support/fixture.ts";
import {
  entriesOf,
  expectTotalsToMatchEntries,
} from "./support/ledger-checks.ts";
import {
  ask,
  destination,
  earner,
  key,
  requested,
} from "./support/payouts-fixture.ts";

registerDatabase();

describe("asking to be paid", () => {
  it("takes everything that is payable, at once, and puts it in flight", async () => {
    const { programKey, referrer } = await earner();
    await rewards.accrual.accrue(saleEvent(referrer, 50_000n));
    const result = await ask(referrer, programKey);
    expect(result.kind).toBe("requested");
    if (result.kind !== "requested") return;
    expect(result.payout).toMatchObject({
      amount: 4_500n,
      assetKey: sats,
      beneficiaryId: referrer,
      destination,
      executor: null,
      programKey,
      state: "requested",
    });
    expect(
      (await entriesOf(referrer, programKey)).every(
        ({ payoutId }) => payoutId === result.payout.id,
      ),
    ).toBe(true);
    expect(await rewards.balances.balance(key(referrer, programKey))).toEqual({
      inFlight: 4_500n,
      maturing: 0n,
      paid: 0n,
      payable: 0n,
    });
    await expectTotalsToMatchEntries(referrer, programKey);
  });

  it("leaves out what is still maturing, and takes it with the next payout", async () => {
    const { programKey, referrer } = await earner({ maturitySeconds: 3_600 });
    advance(3_700);
    await rewards.accrual.accrue(saleEvent(referrer, 100_000n));
    const result = await ask(referrer, programKey);
    expect(result).toMatchObject({
      kind: "requested",
      payout: { amount: 3_000n },
    });
    expect(
      (await rewards.balances.balance(key(referrer, programKey))).maturing,
    ).toBe(3_000n);
  });

  it("refuses below the program's minimum, naming the minimum and what is payable", async () => {
    const { programKey, referrer } = await earner({ minimumPayout: 3_001n });
    expect(await ask(referrer, programKey)).toEqual({
      kind: "below-minimum",
      minimum: 3_001n,
      payable: 3_000n,
    });
    await expectTotalsToMatchEntries(referrer, programKey);
  });

  it("accepts exactly the minimum", async () => {
    const { programKey, referrer } = await earner({ minimumPayout: 3_000n });
    expect((await ask(referrer, programKey)).kind).toBe("requested");
  });

  it("reads the minimum in force when asked, not when the earning was made", async () => {
    const { programKey, referrer } = await earner({ minimumPayout: 1n });
    advance(60);
    await startProgram(programKey, { minimumPayout: 10_000n });
    expect((await ask(referrer, programKey)).kind).toBe("below-minimum");
  });

  it("has nothing to pay when there is nothing, and not when reversals have taken it all", async () => {
    const nobody = await seedUser();
    const programKey = freshProgram();
    await startProgram(programKey);
    expect(await ask(nobody, programKey)).toMatchObject({
      kind: "below-minimum",
      payable: 0n,
    });
    const { programKey: other, referrer } = await earner();
    const [entry] = await entriesOf(referrer, other);
    await rewards.accrual.reverse({
      programKey: other,
      sourceKey: entry?.sourceKey ?? "",
    });
    expect(await ask(referrer, other)).toMatchObject({
      kind: "below-minimum",
      payable: 0n,
    });
  });

  it("can still be paid what was earned when the program has been switched off", async () => {
    const { programKey, referrer } = await earner();
    advance(60);
    await rewards.programs.setProgram(null, programKey, {
      enabled: false,
      kind: "test-sale-cut",
      maturitySeconds: 0,
      minimumPayout: 0n,
      params: { basisPoints: 300 },
    });
    expect((await ask(referrer, programKey)).kind).toBe("requested");
  });

  it("refuses a program that does not exist, and a destination that is empty or too long", async () => {
    const referrer = await seedUser();
    expect(await ask(referrer, freshProgram())).toEqual({
      kind: "unknown-program",
    });
    const { programKey } = await earner();
    for (const bad of ["", "   ", "x".repeat(257)])
      expect(
        await rewards.payouts.request({
          assetKey: sats,
          beneficiaryId: referrer,
          destination: bad,
          programKey,
        }),
      ).toEqual({ kind: "invalid-destination" });
  });

  it("returns the payout that is open instead of making a second, even when asked at the same moment", async () => {
    const { programKey, referrer } = await earner();
    const results = await Promise.all([
      ask(referrer, programKey),
      ask(referrer, programKey),
      ask(referrer, programKey),
    ]);
    expect(results.filter(({ kind }) => kind === "requested")).toHaveLength(1);
    const ids = results.flatMap((result) =>
      "payout" in result ? [result.payout.id] : [],
    );
    expect(new Set(ids).size).toBe(1);
    expect(
      (await rewards.payouts.open()).filter(
        ({ beneficiaryId }) => beneficiaryId === referrer,
      ),
    ).toHaveLength(1);
  });

  it("keeps what is earned while a payout is open for the next one", async () => {
    const { payout, programKey, referrer } = await requested();
    await rewards.accrual.accrue(saleEvent(referrer, 100_000n));
    expect(await ask(referrer, programKey)).toMatchObject({
      kind: "already-open",
      payout: { id: payout.id },
    });
    expect(
      (await rewards.balances.balance(key(referrer, programKey))).payable,
    ).toBe(3_000n);
  });

  it("writes down the request in the payout's audit", async () => {
    const { payout } = await requested();
    const moves = await rewards.payouts.transitions(payout.id);
    expect(moves.map(({ fromState, toState }) => [fromState, toState])).toEqual(
      [[null, "requested"]],
    );
  });
});
