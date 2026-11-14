import type { ReferralBatch } from "@frostbite/shared/referrals";

import { feeAsset } from "./data.ts";

export const signedTransaction = {
  chain: "simnet:one",
  family: "simulated",
  format: "sim-json/1",
  payload: "unsigned-payload",
};

// A batch awaiting a signature that pays two people, unless a test changes it.
export const batchOf = (
  change: Partial<ReferralBatch> = {},
): ReferralBatch => ({
  assetKey: feeAsset,
  createdAt: "2026-11-14T12:00:00.000Z",
  expiresAt: "2026-11-14T13:00:00.000Z",
  failureReason: null,
  feeUnits: "500",
  id: "0198a5c4-7b3e-7c1a-8f2d-4e5b6a7c8d9e",
  payments: [
    { recipient: "sim:simnet:one:aaa", units: "20000" },
    { recipient: "sim:simnet:one:bbb", units: "30000" },
  ],
  sentAt: null,
  state: "awaiting_signature",
  toSign: signedTransaction,
  totalUnits: "50000",
  transactionId: null,
  ...change,
});

// The batch once it has been sent: nothing left to sign.
export const sentBatch = (change: Partial<ReferralBatch> = {}) =>
  batchOf({
    sentAt: "2026-11-14T12:05:00.000Z",
    state: "broadcast_accepted",
    toSign: null,
    transactionId: "tx1",
    ...change,
  });

export const payNavigation = [
  {
    area: "admin" as const,
    href: "/admin/referrals/payouts",
    label: "Referral payouts",
  },
];
