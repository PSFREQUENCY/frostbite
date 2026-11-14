import type { DatabaseClient } from "@frostbite/database/connection";
import { authUsers } from "@frostbite/database/schema/auth";
import { gameMilestoneClaims } from "@frostbite/database/schema/game-claims";
import {
  referralFreezes,
  referralLinks,
} from "@frostbite/database/schema/referrals";
import {
  rewardBalances,
  rewardEntries,
} from "@frostbite/database/schema/rewards";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  inArray,
  max,
  sql,
  type SQL,
} from "drizzle-orm";

import { referralProgramKey } from "./kind.ts";

export const referrerFilters = ["all", "frozen", "waiting"] as const;
export const referrerSorts = ["pot", "referred", "recent"] as const;
export type ReferrerFilter = (typeof referrerFilters)[number];
export type ReferrerSort = (typeof referrerSorts)[number];

export interface ReferrersQuery {
  // The asset the pot is shown in: a list of people mixing assets would add what cannot be added. None shows a pot of nothing.
  readonly assetKey: string | null;
  readonly filter: ReferrerFilter;
  // From 1.
  readonly page: number;
  readonly pageSize: number;
  readonly sort: ReferrerSort;
}

export interface ReferrerRow {
  readonly frozen: boolean;
  readonly lastEarnedAt: Date | null;
  readonly lastReferredAt: Date;
  readonly name: string;
  // Paid so far, and what is unpaid (payable and maturing), in the asset of the query.
  readonly paid: bigint;
  readonly referred: number;
  readonly referrerId: string;
  readonly unpaid: bigint;
}

export interface ReferrersPage {
  readonly hasMore: boolean;
  readonly rows: readonly ReferrerRow[];
}

// The referrers, who has them and how they stand: a page a time, filtered and sorted in the database. Pages are counted rather than
// continued from a key because the order is chosen by the reader and an admin pages through people, not a history that grows by the minute.
export function createReferrers(dependencies: {
  readonly database: DatabaseClient;
}) {
  const { database } = dependencies;
  return async function referrers(
    query: ReferrersQuery,
  ): Promise<ReferrersPage> {
    const links = database
      .select({
        lastReferredAt: max(referralLinks.createdAt).as("last_referred_at"),
        referred: count().as("referred"),
        referrerId: referralLinks.referrerId,
      })
      .from(referralLinks)
      .groupBy(referralLinks.referrerId)
      .as("links");
    const newestFreezes = database
      .selectDistinctOn([referralFreezes.referrerId], {
        frozen: referralFreezes.frozen,
        referrerId: referralFreezes.referrerId,
      })
      .from(referralFreezes)
      .orderBy(
        referralFreezes.referrerId,
        desc(referralFreezes.createdAt),
        desc(referralFreezes.id),
      )
      .as("newest_freezes");
    const earned = database
      .select({
        beneficiaryId: rewardEntries.beneficiaryId,
        lastEarnedAt: max(rewardEntries.occurredAt).as("last_earned_at"),
      })
      .from(rewardEntries)
      .where(eq(rewardEntries.programKey, referralProgramKey))
      .groupBy(rewardEntries.beneficiaryId)
      .as("earned");

    const frozen = sql<boolean>`coalesce(${newestFreezes.frozen}, false)`;
    const unpaid = sql<bigint>`coalesce(${rewardBalances.unpaid}, 0)`;
    const where: SQL | undefined =
      query.filter === "frozen"
        ? eq(frozen, true)
        : query.filter === "waiting"
          ? gt(unpaid, 0n)
          : undefined;
    const order = {
      pot: [desc(unpaid), asc(links.referrerId)],
      recent: [
        sql`${earned.lastEarnedAt} desc nulls last`,
        asc(links.referrerId),
      ],
      referred: [desc(links.referred), asc(links.referrerId)],
    }[query.sort];

    const rows = await database
      .select({
        frozen,
        lastEarnedAt: earned.lastEarnedAt,
        lastReferredAt: links.lastReferredAt,
        name: authUsers.name,
        paid: sql<bigint>`coalesce(${rewardBalances.paid}, 0)`.mapWith(BigInt),
        referred: links.referred,
        referrerId: links.referrerId,
        unpaid: unpaid.mapWith(BigInt),
      })
      .from(links)
      .innerJoin(authUsers, eq(authUsers.id, links.referrerId))
      .leftJoin(
        rewardBalances,
        and(
          eq(rewardBalances.beneficiaryId, links.referrerId),
          eq(rewardBalances.programKey, referralProgramKey),
          eq(rewardBalances.assetKey, query.assetKey ?? ""),
        ),
      )
      .leftJoin(newestFreezes, eq(newestFreezes.referrerId, links.referrerId))
      .leftJoin(earned, eq(earned.beneficiaryId, links.referrerId))
      .where(where)
      .orderBy(...order)
      .limit(query.pageSize + 1)
      .offset((Math.max(query.page, 1) - 1) * query.pageSize);
    return {
      hasMore: rows.length > query.pageSize,
      rows: rows.slice(0, query.pageSize).map((row) => ({
        ...row,
        lastReferredAt: row.lastReferredAt ?? new Date(0),
      })),
    };
  };
}

export interface ClaimBehind {
  readonly claimId: string;
  readonly gameId: string;
  readonly milestoneId: string;
}

export const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

// The claims some earnings were for, so each earning can be followed to the mint behind it.
export async function claimsBehind(
  database: DatabaseClient,
  claimIds: readonly string[],
): Promise<ReadonlyMap<string, ClaimBehind>> {
  // A source key that is not a claim of ours is not looked up, so a stray one cannot fail a page of staff.
  const known = claimIds.filter((id) => uuidPattern.test(id));
  if (known.length === 0) return new Map();
  const rows = await database
    .select({
      gameId: gameMilestoneClaims.gameId,
      id: gameMilestoneClaims.id,
      milestoneId: gameMilestoneClaims.milestoneId,
    })
    .from(gameMilestoneClaims)
    .where(inArray(gameMilestoneClaims.id, known));
  return new Map(
    rows.map(({ gameId, id, milestoneId }) => [
      id,
      { claimId: id, gameId, milestoneId },
    ]),
  );
}
