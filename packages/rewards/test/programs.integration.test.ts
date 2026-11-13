import { rewardProgramSettings } from "@frostbite/database";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  advance,
  database,
  freshProgram,
  policy,
  registerDatabase,
  rewards,
  seedUser,
  startProgram,
} from "./support/fixture.ts";

registerDatabase();

const input = {
  enabled: true,
  kind: "test-sale-cut",
  maturitySeconds: 60,
  minimumPayout: 1_000n,
  params: { basisPoints: 300 },
};

describe("setting a program", () => {
  it("adds a row, keeps who set it and when, and makes it the program in force", async () => {
    const actor = await seedUser();
    const key = freshProgram();
    const result = await rewards.programs.setProgram(actor, key, input);
    expect(result.ok).toBe(true);
    const found = await rewards.programs.inForce(key);
    expect(found).toMatchObject({
      changedBy: actor,
      enabled: true,
      kind: "test-sale-cut",
      maturitySeconds: 60,
      minimumPayout: 1_000n,
      params: { basisPoints: 300 },
      programKey: key,
    });
  });

  it("keeps every setting as history, newest in force, and never changes an old row", async () => {
    const key = freshProgram();
    await rewards.programs.setProgram(null, key, input);
    advance(10);
    const second = await rewards.programs.setProgram(null, key, {
      ...input,
      params: { basisPoints: 500 },
    });
    advance(10);
    await rewards.programs.setProgram(null, key, { ...input, enabled: false });
    const history = await rewards.programs.history(key);
    expect(history.map(({ enabled }) => enabled)).toEqual([false, true, true]);
    expect(history.map(({ params }) => params)).toEqual([
      { basisPoints: 300 },
      { basisPoints: 500 },
      { basisPoints: 300 },
    ]);
    expect((await rewards.programs.inForce(key))?.enabled).toBe(false);
    if (!second.ok) throw new Error("expected a setting");
    const [stored] = await database
      .select()
      .from(rewardProgramSettings)
      .where(eq(rewardProgramSettings.id, second.setting.id));
    expect(stored?.params).toEqual({ basisPoints: 500 });
  });

  it("limits history to what was asked for, and lists the program in force of each key once", async () => {
    const one = freshProgram();
    const two = freshProgram();
    await rewards.programs.setProgram(null, one, input);
    advance(1);
    await rewards.programs.setProgram(null, one, { ...input, enabled: false });
    await rewards.programs.setProgram(null, two, input);
    expect(await rewards.programs.history(one, 1)).toHaveLength(1);
    const all = await rewards.programs.allInForce();
    expect(all.filter(({ programKey }) => programKey === one)).toHaveLength(1);
    expect(all.find(({ programKey }) => programKey === one)?.enabled).toBe(
      false,
    );
    expect(all.some(({ programKey }) => programKey === two)).toBe(true);
    expect(await rewards.programs.inForce(freshProgram())).toBeNull();
  });

  it.each([
    ["a key that is not a key", "Not A Key", input, "invalid-key"],
    [
      "a kind the platform does not have",
      freshProgram(),
      { ...input, kind: "mystery" },
      "unknown-kind",
    ],
    [
      "settings the kind does not accept",
      freshProgram(),
      { ...input, params: { basisPoints: 0 } },
      "invalid-params",
    ],
    [
      "a negative minimum",
      freshProgram(),
      { ...input, minimumPayout: -1n },
      "negative",
    ],
    [
      "a negative wait",
      freshProgram(),
      { ...input, maturitySeconds: -1 },
      "negative",
    ],
    [
      "a wait that is not a whole number",
      freshProgram(),
      { ...input, maturitySeconds: 1.5 },
      "negative",
    ],
    [
      "a minimum above the policy",
      freshProgram(),
      { ...input, minimumPayout: policy.maximumMinimumPayout + 1n },
      "above-maximum",
    ],
    [
      "a wait above the policy",
      freshProgram(),
      { ...input, maturitySeconds: policy.maximumMaturitySeconds + 1 },
      "above-maximum",
    ],
  ] as const)(
    "refuses %s, and stores nothing",
    async (_name, key, bad, code) => {
      const result = await rewards.programs.setProgram(null, key, bad);
      expect(result).toMatchObject({ code, ok: false });
      expect(await rewards.programs.history(key)).toEqual([]);
    },
  );

  it("says what was wrong with the kind's own settings", async () => {
    const result = await rewards.programs.setProgram(null, freshProgram(), {
      ...input,
      params: { basisPoints: 300, extra: true },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues?.length).toBeGreaterThan(0);
  });

  it("accepts the ceilings themselves", async () => {
    const result = await rewards.programs.setProgram(null, freshProgram(), {
      ...input,
      maturitySeconds: policy.maximumMaturitySeconds,
      minimumPayout: policy.maximumMinimumPayout,
    });
    expect(result.ok).toBe(true);
  });

  it("will not turn a program into another kind, because its earnings were made under the first", async () => {
    const key = freshProgram();
    await startProgram(key);
    const result = await rewards.programs.setProgram(null, key, {
      ...input,
      kind: "test-bonus",
      params: {},
    });
    expect(result).toMatchObject({ code: "kind-changed", ok: false });
  });

  it("makes one change at a time per program, so two kinds cannot both be set at once", async () => {
    const key = freshProgram();
    const outcomes = await Promise.all([
      rewards.programs.setProgram(null, key, input),
      rewards.programs.setProgram(null, key, {
        ...input,
        kind: "test-bonus",
        params: {},
      }),
    ]);
    expect(outcomes.filter(({ ok }) => ok)).toHaveLength(1);
    expect((await rewards.programs.history(key)).length).toBe(1);
  });
});
