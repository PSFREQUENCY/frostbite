import type {
  History,
  Mine,
  Overview,
  ReferralProgram,
  ReferrerDetail,
  ReferrersPage,
} from "@frostbite/referrals";

export const feeAsset = "simnet:one/native/sim";
export const at = new Date("2026-11-14T12:00:00.000Z");

export const program = (
  change: Partial<ReferralProgram> = {},
): ReferralProgram => ({
  changedAt: at,
  changedBy: "0198a5c4-7b3e-7c1a-8f2d-4e5b6a7c8d9e",
  enabled: true,
  id: "setting-1",
  maturitySeconds: 3_600,
  minimumPayout: 10_000n,
  rateBasisPoints: 300,
  ...change,
});

export const mine = (change: Partial<Mine> = {}): Mine => ({
  code: "BCDFGHJK",
  frozen: false,
  minted: 1,
  pots: [
    {
      assetKey: feeAsset,
      inFlight: 0n,
      maturing: 30n,
      paid: 0n,
      payable: 90n,
    },
  ],
  signedUp: 2,
  ...change,
});

export const history = (change: Partial<History> = {}): History => ({
  entries: {
    items: [
      { amount: 90n, assetKey: feeAsset, at, id: "e1", state: "payable" },
      { amount: -30n, assetKey: feeAsset, at, id: "e2", state: "reversal" },
    ],
    next: null,
  },
  payouts: [],
  ...change,
});

export const overview = (change: Partial<Overview> = {}): Overview => ({
  assets: [
    {
      assetKey: feeAsset,
      inFlight: 10n,
      maturing: 20n,
      owed: 130n,
      paid: 500n,
      payable: 100n,
    },
  ],
  frozen: 1,
  minted: 3,
  referred: 5,
  referrers: 2,
  ...change,
});

export const referrersPage = (
  change: Partial<ReferrersPage> = {},
): ReferrersPage => ({
  hasMore: false,
  rows: [
    {
      frozen: false,
      lastEarnedAt: at,
      lastReferredAt: at,
      name: "Ada",
      paid: 500n,
      referred: 2,
      referrerId: "0198a5c4-7b3e-7c1a-8f2d-4e5b6a7c8d01",
      unpaid: 130n,
    },
    {
      frozen: true,
      lastEarnedAt: null,
      lastReferredAt: at,
      name: "Grace",
      paid: 0n,
      referred: 1,
      referrerId: "0198a5c4-7b3e-7c1a-8f2d-4e5b6a7c8d02",
      unpaid: 0n,
    },
  ],
  ...change,
});

export const detail = (
  change: Partial<ReferrerDetail> = {},
): ReferrerDetail => ({
  code: "BCDFGHJK",
  earnings: {
    items: [
      {
        amount: 90n,
        assetKey: feeAsset,
        at,
        claim: { claimId: "claim-9", gameId: "game-one", milestoneId: "first" },
        id: "e1",
        state: "payable",
        takenBack: null,
      },
      {
        amount: -30n,
        assetKey: feeAsset,
        at,
        claim: null,
        id: "e2",
        state: "reversal",
        takenBack: null,
      },
    ],
    next: "2026-11-14T12:00:00.000Z|e2",
  },
  freezes: [
    {
      changedBy: null,
      createdAt: at,
      frozen: true,
      reason: "Looked odd.",
      referrerId: "0198a5c4-7b3e-7c1a-8f2d-4e5b6a7c8d01",
    },
  ],
  frozen: false,
  minted: 1,
  name: "Ada",
  payouts: [],
  pots: [
    {
      assetKey: feeAsset,
      inFlight: 0n,
      maturing: 0n,
      paid: 0n,
      payable: 60n,
    },
  ],
  referrerId: "0198a5c4-7b3e-7c1a-8f2d-4e5b6a7c8d01",
  signedUp: 2,
  ...change,
});

export const navigationFor = (admin: boolean) => [
  { area: "main" as const, href: "/games", label: "Games" },
  ...(admin
    ? [
        {
          area: "admin" as const,
          href: "/admin/referrals/program",
          label: "Referral program",
        },
      ]
    : []),
];

// The ceilings the tests run under.
export const policy = {
  maximumMaturitySeconds: 2_592_000,
  maximumMinimumPayout: 10_000_000n,
};

// An earning of the detail page in the state given, for the page that offers to take it back.
export const earningIn = (
  state: "in-payout" | "maturing" | "paid" | "payable" | "reversal",
  change: Partial<ReferrerDetail["earnings"]["items"][number]> = {},
): ReferrerDetail["earnings"]["items"][number] => ({
  amount: state === "reversal" ? -300n : 300n,
  assetKey: feeAsset,
  at,
  claim: { claimId: "claim-9", gameId: "game-one", milestoneId: "first" },
  id: "0198a5c4-7b3e-7c1a-8f2d-4e5b6a7c8d9e",
  state,
  takenBack: null,
  ...change,
});
