import type { Rewards, ProgramSetting } from "@frostbite/rewards";

import {
  referralCutParams,
  referralKindId,
  referralProgramKey,
} from "./kind.ts";

// The referral program as people are told of it and as an admin sets it: one record, read by the public page, the admin page and the
// ledger alike, so what is said and what is paid cannot differ.
export interface ReferralProgram {
  readonly changedAt: Date;
  // Who set it; none when that account is gone.
  readonly changedBy: string | null;
  readonly enabled: boolean;
  readonly id: string;
  // The seconds an earning waits before it can be paid.
  readonly maturitySeconds: number;
  // The least a payout may be, in the smallest unit of the asset.
  readonly minimumPayout: bigint;
  // The share of the platform fee a completed claim earns, in hundredths of a percent.
  readonly rateBasisPoints: number;
}

export interface ReferralProgramInput {
  readonly enabled: boolean;
  readonly maturitySeconds: number;
  readonly minimumPayout: bigint;
  readonly rateBasisPoints: number;
}

const defaultHistory = 50;

function toProgram(setting: ProgramSetting): ReferralProgram {
  // What the ledger holds was checked against the kind's schema when it was written.
  const { rateBasisPoints } = referralCutParams.parse(setting.params);
  return {
    changedAt: setting.changedAt,
    changedBy: setting.changedBy,
    enabled: setting.enabled,
    id: setting.id,
    maturitySeconds: setting.maturitySeconds,
    minimumPayout: setting.minimumPayout,
    rateBasisPoints,
  };
}

// Reading and setting the one program, without the caller knowing its key or kind. A program nobody has set is none, and is off.
export function createProgram(rewards: Pick<Rewards, "programs">) {
  const { programs } = rewards;
  return {
    // The program in force, or none while nobody has set it.
    async current(): Promise<ReferralProgram | null> {
      const setting = await programs.inForce(referralProgramKey);
      return setting === null ? null : toProgram(setting);
    },

    // Every setting, newest first: who set what, and when.
    async history(limit = defaultHistory): Promise<readonly ReferralProgram[]> {
      return (await programs.history(referralProgramKey, limit)).map(toProgram);
    },

    // Adds a setting, which is in force from now. The refusals are the ledger's (a number past a ceiling, a rate outside the kind's range).
    async set(actorId: string, input: ReferralProgramInput) {
      const result = await programs.setProgram(actorId, referralProgramKey, {
        enabled: input.enabled,
        kind: referralKindId,
        maturitySeconds: input.maturitySeconds,
        minimumPayout: input.minimumPayout,
        params: { rateBasisPoints: input.rateBasisPoints },
      });
      return result.ok
        ? ({ ok: true, program: toProgram(result.setting) } as const)
        : result;
    },
  };
}

export type Program = ReturnType<typeof createProgram>;
