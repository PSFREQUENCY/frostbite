import { describe, expect, it } from "vitest";

import {
  claimCompletedPayload,
  maximumRateBasisPoints,
  referralCut,
  referralCutParams,
  sourceKeyOfClaim,
} from "../src/kind.ts";

const referrer = "0190f3c2-7a4e-7d4b-9f3e-1a2b3c4d5e6f";
const minter = "0190f3c2-7a4e-7d4b-9f3e-1a2b3c4d5e70";
const asset = "bitcoin:signet/native/btc";

const earnings = (
  fee: string,
  rate: number,
  who: { referrer: string | null; referrerFrozen: boolean } = {
    referrer,
    referrerFrozen: false,
  },
) =>
  referralCut.accrue({
    eventId: "claim-1",
    occurredAt: new Date("2026-11-13T12:00:00Z"),
    params: { rateBasisPoints: rate },
    payload: {
      asset,
      claimId: "claim-1",
      fee,
      gameId: "game-one",
      milestoneId: "first",
      minter,
      ...who,
    },
  });

describe("what a claim earns the referrer", () => {
  it("is the rate of the platform fee, in hundredths of a percent, for the referrer, named by the claim", () => {
    expect(earnings("3000", 300)).toEqual({
      drafts: [
        {
          amount: 90n,
          assetKey: asset,
          beneficiaryId: referrer,
          sourceKey: sourceKeyOfClaim("claim-1"),
        },
      ],
      ok: true,
    });
  });

  it("rounds down, so the platform never pays more than the rate", () => {
    expect(earnings("1999", 300)).toMatchObject({
      drafts: [{ amount: 59n }],
    });
  });

  it("earns nothing for a person nobody referred, for a frozen referrer, or when the cut rounds to nothing", () => {
    expect(
      earnings("3000", 300, { referrer: null, referrerFrozen: false }),
    ).toEqual({ drafts: [], ok: true });
    expect(earnings("3000", 300, { referrer, referrerFrozen: true })).toEqual({
      drafts: [],
      ok: true,
    });
    expect(earnings("33", 300)).toEqual({ drafts: [], ok: true });
    expect(earnings("0", 300)).toEqual({ drafts: [], ok: true });
  });

  it("does not overflow on a fee larger than a safe integer", () => {
    expect(earnings("90071992547409910000", 100)).toMatchObject({
      drafts: [{ amount: 900719925474099100n }],
    });
  });

  it("refuses an event whose fee is not whole units, and settings that are not a rate under the whole fee", () => {
    expect(earnings("-5", 300)).toEqual({ ok: false, reason: "bad-payload" });
    expect(earnings("1.5", 300)).toEqual({ ok: false, reason: "bad-payload" });
    expect(earnings("3000", 0)).toEqual({ ok: false, reason: "bad-params" });
    expect(earnings("3000", 10_000)).toEqual({
      ok: false,
      reason: "bad-params",
    });
  });
});

describe("the settings of the referral cut", () => {
  it("accept a rate up to the largest under the whole fee, and nothing else in the settings", () => {
    expect(
      referralCutParams.safeParse({ rateBasisPoints: maximumRateBasisPoints })
        .success,
    ).toBe(true);
    expect(
      referralCutParams.safeParse({
        extra: true,
        rateBasisPoints: 300,
      }).success,
    ).toBe(false);
    expect(referralCutParams.safeParse({ rateBasisPoints: 3.5 }).success).toBe(
      false,
    );
  });

  it("require the minter to be an account id, so the event cannot name anything else", () => {
    expect(
      claimCompletedPayload.safeParse({
        asset,
        claimId: "c",
        fee: "1",
        gameId: "g",
        milestoneId: "m",
        minter: "not-an-id",
        referrer: null,
        referrerFrozen: false,
      }).success,
    ).toBe(false);
  });
});
