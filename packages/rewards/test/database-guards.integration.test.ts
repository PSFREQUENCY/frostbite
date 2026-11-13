import { rewardEntries, rewardPayouts } from "@frostbite/database";
import { eq, sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  database,
  freshProgram,
  registerDatabase,
  rewards,
  saleEvent,
  sats,
  seedUser,
  startProgram,
} from "./support/fixture.ts";

registerDatabase();

// The ledger's rules are held by the database, not only by the code that writes to it: these write straight to the tables, as a second writer
// or a bug would, and the database refuses.
async function earner() {
  const referrer = await seedUser();
  const programKey = freshProgram();
  const setting = await startProgram(programKey);
  await rewards.accrual.accrue(saleEvent(referrer, 100_000n));
  const [entry] = await database
    .select()
    .from(rewardEntries)
    .where(eq(rewardEntries.beneficiaryId, referrer));
  if (entry === undefined) throw new Error("expected an entry");
  return { entry, programKey, referrer, setting };
}

async function payoutOf(referrer: string, programKey: string) {
  const result = await rewards.payouts.request({
    assetKey: sats,
    beneficiaryId: referrer,
    destination: "x:y:z",
    programKey,
  });
  if (result.kind !== "requested") throw new Error("expected a payout");
  return result.payout;
}

const refuses = (run: PromiseLike<unknown>, message: RegExp) =>
  expect(Promise.resolve(run)).rejects.toThrow(message);

describe("an entry of the ledger", () => {
  it("is never changed: not its amount, who it is for, what it is for, or when it can be paid", async () => {
    const { entry } = await earner();
    for (const change of [
      { amount: 1n },
      { beneficiaryId: await seedUser() },
      { assetKey: "other/native/x" },
      { payableAt: new Date(0) },
      { sourceKey: "something-else" },
      { programKey: "another" },
    ])
      await refuses(
        database
          .update(rewardEntries)
          .set(change)
          .where(eq(rewardEntries.id, entry.id)),
        /Failed query|never changed/u,
      );
  });

  it("is never deleted", async () => {
    const { entry } = await earner();
    await refuses(
      database.delete(rewardEntries).where(eq(rewardEntries.id, entry.id)),
      /Failed query|never deleted/u,
    );
  });

  it("is made outside every payout, with the right sign for what it is", async () => {
    const { entry, referrer, setting } = await earner();
    const base = {
      assetKey: sats,
      beneficiaryId: referrer,
      occurredAt: new Date(),
      payableAt: new Date(),
      programKey: entry.programKey,
      settingId: setting.id,
    };
    await refuses(
      database.insert(rewardEntries).values({
        ...base,
        amount: -5n,
        id: crypto.randomUUID(),
        kind: "accrual",
        sourceKey: "neg",
      }),
      /Failed query|violates check/u,
    );
    await refuses(
      database.insert(rewardEntries).values({
        ...base,
        amount: 5n,
        id: crypto.randomUUID(),
        kind: "reversal",
        reversesEntryId: entry.id,
        sourceKey: "wrongsign",
      }),
      /Failed query|violates check/u,
    );
    await refuses(
      database.insert(rewardEntries).values({
        ...base,
        amount: -5n,
        id: crypto.randomUUID(),
        kind: "reversal",
        sourceKey: "noreverses",
      }),
      /Failed query|violates check/u,
    );
    await refuses(
      database.insert(rewardEntries).values({
        ...base,
        amount: 5n,
        id: crypto.randomUUID(),
        kind: "accrual",
        sourceKey: entry.sourceKey,
      }),
      /Failed query|duplicate key/u,
    );
  });

  it("joins only a payout that is still requested, and for the same person, program and asset", async () => {
    const one = await earner();
    const two = await earner();
    const payout = await payoutOf(one.referrer, one.programKey);
    // Another person's entry cannot be put in this payout.
    await refuses(
      database
        .update(rewardEntries)
        .set({ payoutId: payout.id })
        .where(eq(rewardEntries.id, two.entry.id)),
      /Failed query|joins only a requested payout/u,
    );
    // And once the payout is with an executor, nothing more joins it.
    await rewards.accrual.accrue(saleEvent(one.referrer, 100_000n));
    await rewards.payouts.begin(payout.id, { executor: "x" });
    const [late] = await database
      .select()
      .from(rewardEntries)
      .where(
        sql`${rewardEntries.beneficiaryId} = ${one.referrer} and ${rewardEntries.payoutId} is null`,
      );
    await refuses(
      database
        .update(rewardEntries)
        .set({ payoutId: payout.id })
        .where(eq(rewardEntries.id, late?.id ?? "")),
      /Failed query|joins only a requested payout/u,
    );
  });

  it("leaves one payout before joining another, and leaves only a payout that is not over", async () => {
    const one = await earner();
    const first = await payoutOf(one.referrer, one.programKey);
    const other = await earner();
    const second = await payoutOf(other.referrer, other.programKey);
    await refuses(
      database
        .update(rewardEntries)
        .set({ payoutId: second.id })
        .where(eq(rewardEntries.id, one.entry.id)),
      /Failed query|leaves its payout before/u,
    );
    await rewards.payouts.begin(first.id, { executor: "x" });
    await rewards.payouts.complete(first.id, { ref: "tx" });
    await refuses(
      database
        .update(rewardEntries)
        .set({ payoutId: null })
        .where(eq(rewardEntries.id, one.entry.id)),
      /Failed query|leaves only a payout that is not over/u,
    );
  });
});

describe("a payout", () => {
  it("moves only the allowed ways, and never again once it is over", async () => {
    const { programKey, referrer } = await earner();
    const payout = await payoutOf(referrer, programKey);
    const set = (state: string) =>
      database
        .update(rewardPayouts)
        .set({ state })
        .where(eq(rewardPayouts.id, payout.id));
    await refuses(
      set("complete"),
      /Failed query|cannot move from requested to complete/u,
    );
    await refuses(set("paid"), /Failed query|violates check/u);
    await rewards.payouts.begin(payout.id, { executor: "x" });
    await refuses(
      set("requested"),
      /Failed query|cannot move from in_progress to requested/u,
    );
    await refuses(
      set("cancelled"),
      /Failed query|cannot move from in_progress to cancelled/u,
    );
    await rewards.payouts.complete(payout.id, { ref: "tx" });
    await refuses(
      set("failed"),
      /Failed query|cannot move from complete to failed/u,
    );
  });

  it("never changes what it is for, and is never deleted", async () => {
    const { programKey, referrer } = await earner();
    const payout = await payoutOf(referrer, programKey);
    for (const change of [
      { amount: 1n },
      { destination: "elsewhere" },
      { assetKey: "x/native/y" },
      { programKey: "other" },
    ])
      await refuses(
        database
          .update(rewardPayouts)
          .set(change)
          .where(eq(rewardPayouts.id, payout.id)),
        /Failed query|never changes/u,
      );
    await refuses(
      database.delete(rewardPayouts).where(eq(rewardPayouts.id, payout.id)),
      /Failed query|never deleted/u,
    );
  });

  it("does not end without paying while entries are still in it, and does not complete unless they add up to its amount", async () => {
    const { programKey, referrer } = await earner();
    const payout = await payoutOf(referrer, programKey);
    await refuses(
      database
        .update(rewardPayouts)
        .set({ state: "cancelled" })
        .where(eq(rewardPayouts.id, payout.id)),
      /Failed query|lets its entries go first/u,
    );
    await rewards.payouts.begin(payout.id, { executor: "x" });
    // Take one entry out by hand, as a bug would: the payout then no longer adds up, and cannot complete.
    await database
      .update(rewardEntries)
      .set({ payoutId: null })
      .where(eq(rewardEntries.payoutId, payout.id));
    await refuses(
      database
        .update(rewardPayouts)
        .set({ state: "complete" })
        .where(eq(rewardPayouts.id, payout.id)),
      /Failed query|adding up to its amount/u,
    );
  });

  it("is open once at a time for a person, program and asset", async () => {
    const { programKey, referrer } = await earner();
    const payout = await payoutOf(referrer, programKey);
    await refuses(
      database.insert(rewardPayouts).values({
        amount: 5n,
        assetKey: sats,
        beneficiaryId: referrer,
        destination: "x",
        id: crypto.randomUUID(),
        programKey,
        state: "requested",
      }),
      /Failed query|duplicate key/u,
    );
    expect(payout.state).toBe("requested");
  });
});
