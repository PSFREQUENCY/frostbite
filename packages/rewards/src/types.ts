import type { JsonValue } from "@frostbite/shared/chain";

// A thing that happened on the platform which may earn someone something: a claim completed, a run was verified. It names itself (`type`, and
// an `id` that is the same every time the same thing is told again), says when it happened, and carries the facts a program needs. It comes
// from the platform's own code, but its payload is still checked against what the kind that reads it expects.
export interface RewardEvent {
  readonly id: string;
  readonly occurredAt: Date;
  readonly payload: JsonValue;
  readonly type: string;
}

// One earning a kind asks for: who, how much of what, and what it is FOR. `sourceKey` is the same every time the same thing is told again,
// which is what makes a repeated event pay nothing twice.
export interface EntryDraft {
  readonly amount: bigint;
  readonly assetKey: string;
  readonly beneficiaryId: string;
  readonly sourceKey: string;
}

// A program as it is set: which kind it is, the kind's own settings, whether it is on, the least a payout may be, and how long an earning
// waits before it can be paid. The newest setting of a program is the one in force.
export interface ProgramSetting {
  readonly changedAt: Date;
  // Who set it; none when that account is gone.
  readonly changedBy: string | null;
  readonly enabled: boolean;
  readonly id: string;
  readonly kind: string;
  readonly maturitySeconds: number;
  readonly minimumPayout: bigint;
  readonly params: JsonValue;
  readonly programKey: string;
}

// What a person has under one program and asset, in base units. `payable` can be paid out now; `maturing` is earned but not yet payable;
// `inFlight` is in a payout that is not over; `paid` has been paid. `payable` and `maturing` can be negative together only through a
// reversal after payment (a debt the next earnings pay off first).
export interface Balance {
  readonly inFlight: bigint;
  readonly maturing: bigint;
  readonly paid: bigint;
  readonly payable: bigint;
}

export interface BalanceKey {
  readonly assetKey: string;
  readonly beneficiaryId: string;
  readonly programKey: string;
}

export type EntryKind = "accrual" | "reversal";

export interface Entry {
  readonly amount: bigint;
  readonly assetKey: string;
  readonly beneficiaryId: string;
  readonly createdAt: Date;
  readonly id: string;
  readonly kind: EntryKind;
  readonly occurredAt: Date;
  readonly payableAt: Date;
  readonly payoutId: string | null;
  readonly programKey: string;
  readonly sourceKey: string;
}

export type PayoutState =
  "cancelled" | "complete" | "failed" | "in_progress" | "requested";

export interface Payout {
  readonly amount: bigint;
  readonly assetKey: string;
  readonly beneficiaryId: string;
  readonly completedAt: Date | null;
  readonly createdAt: Date;
  readonly destination: string;
  readonly executor: string | null;
  readonly executorRef: string | null;
  readonly failureReason: string | null;
  readonly id: string;
  readonly programKey: string;
  readonly state: PayoutState;
  readonly updatedAt: Date;
}

// A page of a list, newest first, with where the next one starts.
export interface Page<Item> {
  readonly items: readonly Item[];
  readonly next: string | null;
}
