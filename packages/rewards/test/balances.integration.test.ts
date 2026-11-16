import { rewardEntries } from "@frostbite/database";
import { count, eq, sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { balanceQueries, parseCursor } from "../src/balances.ts";
import {
  advance,
  clock,
  database,
  freshProgram,
  otherAsset,
  registerDatabase,
  rewards,
  saleEvent,
  sats,
  seedUser,
  startProgram,
} from "./support/fixture.ts";

registerDatabase();

const key = (beneficiaryId: string, programKey: string, assetKey = sats) => ({
  assetKey,
  beneficiaryId,
  programKey,
});

describe("what a person has", () => {
  it("is nothing for a person with nothing, and keeps each program and asset apart", async () => {
    const person = await seedUser();
    expect(await rewards.balances.balance(key(person, freshProgram()))).toEqual(
      {
        inFlight: 0n,
        maturing: 0n,
        paid: 0n,
        payable: 0n,
      },
    );
    const programKey = freshProgram();
    await startProgram(programKey);
    await rewards.accrual.accrue(saleEvent(person, 100_000n));
    expect(
      (await rewards.balances.balance(key(person, programKey))).payable,
    ).toBe(3_000n);
    expect(
      (await rewards.balances.balance(key(person, programKey, otherAsset)))
        .payable,
    ).toBe(0n);
    expect(
      (await rewards.balances.balance(key(person, freshProgram()))).payable,
    ).toBe(0n);
  });

  it("moves an earning from maturing to payable as time passes, and shows both", async () => {
    const person = await seedUser();
    const programKey = freshProgram();
    await startProgram(programKey, { maturitySeconds: 600 });
    await rewards.accrual.accrue(saleEvent(person, 100_000n));
    expect(
      await rewards.balances.balance(key(person, programKey)),
    ).toMatchObject({ maturing: 3_000n, payable: 0n });
    advance(599);
    expect(
      await rewards.balances.balance(key(person, programKey)),
    ).toMatchObject({ maturing: 3_000n, payable: 0n });
    advance(1);
    expect(
      await rewards.balances.balance(key(person, programKey)),
    ).toMatchObject({ maturing: 0n, payable: 3_000n });
  });
});

describe("a person's entries", () => {
  it("come newest first, a page at a time, each entry once, and end where they end", async () => {
    const person = await seedUser();
    const programKey = freshProgram();
    await startProgram(programKey);
    for (let index = 0; index < 5; index += 1) {
      await rewards.accrual.accrue(saleEvent(person, 100_000n));
      advance(1);
    }
    const first = await rewards.balances.entries(person, programKey, {
      limit: 2,
    });
    expect(first.items).toHaveLength(2);
    expect(first.next).not.toBeNull();
    const second = await rewards.balances.entries(person, programKey, {
      after: first.next,
      limit: 2,
    });
    const third = await rewards.balances.entries(person, programKey, {
      after: second.next,
      limit: 2,
    });
    const ids = [...first.items, ...second.items, ...third.items].map(
      ({ id }) => id,
    );
    expect(new Set(ids).size).toBe(5);
    expect(third.next).toBeNull();
    const times = [...first.items, ...second.items, ...third.items].map(
      ({ createdAt }) => createdAt.getTime(),
    );
    expect(times).toEqual([...times].sort((a, b) => b - a));
  });

  it("do not tie up on entries made at the same moment, and keep the page size within bounds", async () => {
    const person = await seedUser();
    const programKey = freshProgram();
    await startProgram(programKey);
    for (let index = 0; index < 3; index += 1)
      await rewards.accrual.accrue(saleEvent(person, 100_000n));
    const seen = new Set<string>();
    let after: string | null = null;
    do {
      const page = await rewards.balances.entries(person, programKey, {
        after,
        limit: 1,
      });
      for (const { id } of page.items) seen.add(id);
      after = page.next;
    } while (after !== null);
    expect(seen.size).toBe(3);
    expect(
      (await rewards.balances.entries(person, programKey, { limit: 0 })).items,
    ).toHaveLength(1);
    expect(
      (await rewards.balances.entries(person, programKey, { limit: 10_000 }))
        .items,
    ).toHaveLength(3);
  });

  it("refuse a page cursor that is not one", async () => {
    const person = await seedUser();
    await expect(
      rewards.balances.entries(person, freshProgram(), { after: "nonsense" }),
    ).rejects.toThrow(TypeError);
    expect(parseCursor(null)).toBeNull();
    expect(() => parseCursor("not-a-date|id")).toThrow(TypeError);
    expect(() => parseCursor("2026-11-13T00:00:00.000Z")).toThrow(TypeError);
    expect(() => parseCursor("2026-11-13T00:00:00.000Z|a|b")).toThrow(
      TypeError,
    );
  });
});

describe("the reads that could grow", () => {
  it("use their indexes however long the history is", async () => {
    const person = await seedUser();
    const programKey = freshProgram();
    const setting = await startProgram(programKey);
    await database.insert(rewardEntries).values(
      Array.from({ length: 3_000 }, (_unused, index) => ({
        amount: 10n,
        assetKey: sats,
        beneficiaryId: person,
        id: crypto.randomUUID(),
        kind: "accrual" as const,
        occurredAt: clock.now,
        payableAt: new Date(clock.now.getTime() + (index % 50) * 1_000),
        programKey,
        settingId: setting.id,
        sourceKey: `bulk:${String(index)}`,
      })),
    );
    const [stored] = await database
      .select({ rows: count() })
      .from(rewardEntries)
      .where(eq(rewardEntries.beneficiaryId, person));
    expect(stored?.rows).toBe(3_000);
    await database.execute(sql`analyze frostbite.reward_entries`);
    const queries = balanceQueries(database);
    const explain = async (query: { getSQL(): ReturnType<typeof sql> }) =>
      JSON.stringify(
        await database.transaction(async (transaction) => {
          await transaction.execute(sql`set local enable_seqscan = off`);
          return transaction.execute(sql`explain ${query.getSQL()}`);
        }),
      );
    const maturing = await explain(
      queries.maturing(key(person, programKey), clock.now),
    );
    expect(maturing).toContain("reward_entries_unpaid_idx");
    expect(maturing).not.toContain("Seq Scan");
    const page = await explain(queries.history(person, programKey, null, 20));
    expect(page).toContain("reward_entries_history_idx");
    expect(page).not.toContain("Sort");
    const next = await explain(
      queries.history(
        person,
        programKey,
        { createdAt: clock.now, id: crypto.randomUUID() },
        20,
      ),
    );
    expect(next).toContain("reward_entries_history_idx");
    expect(next).not.toContain("Sort");
  });
});
