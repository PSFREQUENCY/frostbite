import { chainRefSchema } from "@frostbite/shared/chain";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { assetKeyOf, isAssetKey } from "../src/asset.ts";
import {
  createKindRegistry,
  defineRewardKind,
  RewardKindError,
} from "../src/kinds.ts";
import type { EntryDraft } from "../src/types.ts";

const asset = assetKeyOf({
  chain: chainRefSchema.parse("simnet:one"),
  id: "sim",
  kind: "native",
});
const person = "3f2a9c1e-5b7d-4e8a-9c0d-1a2b3c4d5e6f";
const draft = (over: Partial<EntryDraft> = {}): EntryDraft => ({
  amount: 5n,
  assetKey: asset,
  beneficiaryId: person,
  sourceKey: "a",
  ...over,
});
const kindOf = (drafts: readonly EntryDraft[], id = "k") =>
  defineRewardKind({
    accrue: () => drafts,
    eventType: "thing.happened",
    id,
    paramsSchema: z.object({ rate: z.number().min(1) }).strict(),
    payloadSchema: z.object({ who: z.string() }).strict(),
  });
const input = {
  eventId: "e1",
  occurredAt: new Date(0),
  params: { rate: 3 },
  payload: { who: "x" },
};

describe("an asset key", () => {
  it("is the same for the same asset and different for different ones", () => {
    const chain = chainRefSchema.parse("simnet:one");
    const native = assetKeyOf({ chain, id: "sim", kind: "native" });
    expect(native).toBe("simnet:one/native/sim");
    expect(assetKeyOf({ chain, id: "sim", kind: "native" })).toBe(native);
    expect(assetKeyOf({ chain, id: "sim", kind: "fungible" })).not.toBe(native);
    expect(isAssetKey(native)).toBe(true);
  });

  it.each(["", "nothing", "a/b/c", "x/native/", "a b/native/c", "/native/x"])(
    "is not mistaken for %j",
    (text) => {
      expect(isAssetKey(text)).toBe(false);
    },
  );
});

describe("a reward kind", () => {
  it("turns a checked event into earnings", () => {
    expect(kindOf([draft()]).accrue(input)).toEqual({
      drafts: [draft()],
      ok: true,
    });
  });

  it("says what is wrong rather than guessing: settings first, then the event", () => {
    const kind = kindOf([draft()]);
    expect(kind.accrue({ ...input, params: { rate: 0 } })).toEqual({
      ok: false,
      reason: "bad-params",
    });
    expect(kind.accrue({ ...input, payload: { who: 5 } })).toEqual({
      ok: false,
      reason: "bad-payload",
    });
  });

  it("checks the kind's own settings and says where each problem is", () => {
    const kind = kindOf([]);
    expect(kind.checkParams({ rate: 3 })).toEqual({
      ok: true,
      params: { rate: 3 },
    });
    const bad = kind.checkParams({ extra: 1, rate: 0 });
    expect(bad.ok).toBe(false);
    if (!bad.ok)
      expect(bad.issues.some((issue) => issue.startsWith("rate:"))).toBe(true);
    const wrongShape = kind.checkParams("nothing");
    expect(wrongShape.ok).toBe(false);
    if (!wrongShape.ok) expect(wrongShape.issues[0]).toMatch(/^params:/u);
  });

  it.each([
    ["an amount of zero", draft({ amount: 0n })],
    ["a negative amount", draft({ amount: -1n })],
    ["an asset that is not an asset key", draft({ assetKey: "nonsense" })],
    ["no source", draft({ sourceKey: "" })],
    ["a source that is far too long", draft({ sourceKey: "x".repeat(201) })],
  ])("is a bug in the kind when it asks for %s, and says so", (_what, bad) => {
    expect(() => kindOf([bad], "buggy").accrue(input)).toThrow(RewardKindError);
    expect(() => kindOf([bad], "buggy").accrue(input)).toThrow(/"buggy"/u);
  });

  it("is a bug in the kind when two earnings of one event share a source", () => {
    expect(() => kindOf([draft(), draft()]).accrue(input)).toThrow(
      /the same source key/u,
    );
    expect(
      kindOf([draft(), draft({ sourceKey: "b" })]).accrue(input),
    ).toMatchObject({ ok: true });
  });

  it("allows an event that earns nothing", () => {
    expect(kindOf([]).accrue(input)).toEqual({ drafts: [], ok: true });
  });
});

describe("the registry of kinds", () => {
  it("finds a kind by its id and by the event it reads, and lists them", () => {
    const one = kindOf([], "one");
    const two = defineRewardKind({
      accrue: () => [],
      eventType: "other.event",
      id: "two",
      paramsSchema: z.object({}),
      payloadSchema: z.object({}),
    });
    const registry = createKindRegistry([one, two]);
    expect(registry.get("one")).toBe(one);
    expect(registry.get("missing")).toBeUndefined();
    expect(registry.forEvent("thing.happened")).toEqual([one]);
    expect(registry.forEvent("nothing")).toEqual([]);
    expect(registry.ids()).toEqual(["one", "two"]);
  });

  it("will not have two kinds of one name", () => {
    expect(() =>
      createKindRegistry([kindOf([], "same"), kindOf([], "same")]),
    ).toThrow(/Two reward kinds are named "same"/u);
  });
});
