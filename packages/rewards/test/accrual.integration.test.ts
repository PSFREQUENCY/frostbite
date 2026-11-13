import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { RewardKindError } from "../src/kinds.ts";
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

registerDatabase();

describe("an event earning something", () => {
  it("writes an earning for the beneficiary, named by what it is for, and counts it in their pot", async () => {
    const referrer = await seedUser();
    const key = freshProgram();
    const setting = await startProgram(key, { basisPoints: 300 });
    const event = saleEvent(referrer, 10_000n);
    const result = await rewards.accrual.accrue(event);
    expect(result).toEqual({ accrued: 1, duplicates: 0, skipped: [] });
    const [entry] = await entriesOf(referrer, key);
    expect(entry).toMatchObject({
      amount: 300n,
      assetKey: sats,
      beneficiaryId: referrer,
      kind: "accrual",
      payoutId: null,
      programKey: key,
      settingId: setting.id,
      sourceKey: `sale:${event.id}`,
    });
    expect(await expectTotalsToMatchEntries(referrer, key)).toEqual({
      inFlight: 0n,
      paid: 0n,
      unpaid: 300n,
    });
  });

  it("is told the same event again and writes nothing twice, said plainly", async () => {
    const referrer = await seedUser();
    const key = freshProgram();
    await startProgram(key);
    const event = saleEvent(referrer, 10_000n);
    await rewards.accrual.accrue(event);
    const again = await rewards.accrual.accrue(event);
    expect(again).toEqual({ accrued: 0, duplicates: 1, skipped: [] });
    expect(await entriesOf(referrer, key)).toHaveLength(1);
    await expectTotalsToMatchEntries(referrer, key);
  });

  it("writes one earning when the same event is told many times at once", async () => {
    const referrer = await seedUser();
    const key = freshProgram();
    await startProgram(key);
    const event = saleEvent(referrer, 10_000n);
    const results = await Promise.all(
      Array.from({ length: 8 }, () => rewards.accrual.accrue(event)),
    );
    expect(results.reduce((sum, { accrued }) => sum + accrued, 0)).toBe(1);
    expect(await entriesOf(referrer, key)).toHaveLength(1);
    expect((await expectTotalsToMatchEntries(referrer, key)).unpaid).toBe(300n);
  });

  it("lets the earning wait the program's maturity before it can be paid", async () => {
    const referrer = await seedUser();
    const key = freshProgram();
    await startProgram(key, { maturitySeconds: 3_600 });
    const at = new Date("2026-11-13T11:00:00.000Z");
    await rewards.accrual.accrue(saleEvent(referrer, 10_000n, at));
    const [entry] = await entriesOf(referrer, key);
    expect(entry?.occurredAt).toEqual(at);
    expect(entry?.payableAt).toEqual(new Date("2026-11-13T12:00:00.000Z"));
  });

  it("tells it to every program that reads it, each under its own settings", async () => {
    const referrer = await seedUser();
    const [one, two] = [freshProgram(), freshProgram()];
    await startProgram(one, { basisPoints: 100 });
    await startProgram(two, { basisPoints: 500 });
    const result = await rewards.accrual.accrue(saleEvent(referrer, 10_000n));
    expect(result.accrued).toBe(2);
    expect((await entriesOf(referrer, one))[0]?.amount).toBe(100n);
    expect((await entriesOf(referrer, two))[0]?.amount).toBe(500n);
  });

  it("uses the program setting in force when the event arrives, and remembers which one it was", async () => {
    const referrer = await seedUser();
    const key = freshProgram();
    const first = await startProgram(key, { basisPoints: 100 });
    advance(5);
    const second = await startProgram(key, { basisPoints: 200 });
    await rewards.accrual.accrue(saleEvent(referrer, 10_000n));
    const [entry] = await entriesOf(referrer, key);
    expect(entry?.amount).toBe(200n);
    expect(entry?.settingId).toBe(second.id);
    expect(entry?.settingId).not.toBe(first.id);
  });

  it("earns nothing from a program that is off, and from an event no kind reads", async () => {
    const referrer = await seedUser();
    const off = freshProgram();
    await startProgram(off, { enabled: false });
    expect(
      await rewards.accrual.accrue(saleEvent(referrer, 10_000n)),
    ).toMatchObject({ accrued: 0 });
    expect(
      await rewards.accrual.accrue({
        id: "x-1",
        occurredAt: new Date(),
        payload: {},
        type: "nobody.reads.this",
      }),
    ).toEqual({ accrued: 0, duplicates: 0, skipped: [] });
    expect(await entriesOf(referrer, off)).toEqual([]);
  });

  it("earns nothing when the event names nobody to pay", async () => {
    const key = freshProgram();
    await startProgram(key);
    const result = await rewards.accrual.accrue(saleEvent(null, 10_000n));
    expect(result.accrued).toBe(0);
  });

  it("skips a program whose kind cannot use the event, and says which and why, while the others still earn", async () => {
    const referrer = await seedUser();
    const key = freshProgram();
    await startProgram(key);
    const result = await rewards.accrual.accrue({
      ...saleEvent(referrer, 10_000n),
      payload: { fee: "not a number", referrer },
    });
    expect(result).toEqual({
      accrued: 0,
      duplicates: 0,
      skipped: [{ programKey: key, reason: "bad-payload" }],
    });
  });

  it("refuses an event with no usable id", async () => {
    await expect(
      rewards.accrual.accrue({ ...saleEvent(null, 1n), id: "" }),
    ).rejects.toThrow(TypeError);
    await expect(
      rewards.accrual.accrue({ ...saleEvent(null, 1n), id: "x".repeat(201) }),
    ).rejects.toThrow(TypeError);
  });

  it("keeps nothing of an event when a kind asks for something no entry may be", async () => {
    const people = [await seedUser(), await seedUser()];
    const key = freshProgram();
    const result = await rewards.programs.setProgram(null, key, {
      enabled: true,
      kind: "test-bonus",
      maturitySeconds: 0,
      minimumPayout: 0n,
      params: {},
    });
    expect(result.ok).toBe(true);
    await expect(
      rewards.accrual.accrue({
        id: `bonus-${randomUUID()}`,
        occurredAt: new Date(),
        payload: { amount: "bad", people },
        type: "bonus.awarded",
      }),
    ).rejects.toThrow(RewardKindError);
    expect(await entriesOf(people[0] ?? "", key)).toEqual([]);
  });

  it("writes several earnings of one event together, each once", async () => {
    const people = [await seedUser(), await seedUser(), await seedUser()];
    const key = freshProgram();
    await rewards.programs.setProgram(null, key, {
      enabled: true,
      kind: "test-bonus",
      maturitySeconds: 0,
      minimumPayout: 0n,
      params: {},
    });
    const event = {
      id: `bonus-${randomUUID()}`,
      occurredAt: new Date(),
      payload: { amount: "25", people },
      type: "bonus.awarded",
    };
    expect(await rewards.accrual.accrue(event)).toMatchObject({
      accrued: 3,
      duplicates: 0,
    });
    expect(await rewards.accrual.accrue(event)).toMatchObject({
      accrued: 0,
      duplicates: 3,
    });
    for (const person of people)
      expect((await entriesOf(person, key)).length).toBe(1);
  });
});
