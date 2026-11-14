import type { FollowChange, FollowedRecord } from "@frostbite/chain/follower";
import type { ChainRef, UnsignedTransaction } from "@frostbite/shared/chain";

// A batch staff pay referrers with, as it is kept: the transaction built for it and where it is in the chain's lifecycle, and which payouts
// it pays.
export interface StoredBatch extends FollowedRecord {
  readonly assetKey: string;
  readonly createdAt: Date;
  readonly createdBy: string | null;
  readonly failureReason: string | null;
  readonly payoutIds: readonly string[];
  readonly submittedBy: string | null;
  readonly updatedAt: Date;
}

export interface NewBatch {
  readonly assetKey: string;
  readonly chain: ChainRef;
  readonly createdAt: Date;
  readonly createdBy: string;
  readonly expiresAt: Date;
  readonly id: string;
  readonly payoutIds: readonly string[];
  readonly unsigned: UnsignedTransaction;
}

export type CreateBatchResult = {
  readonly batch: StoredBatch;
  readonly kind: "created" | "in-progress";
};

// Where batches live. `create` does what must not be done in two steps: it lets an unsigned batch that has run out of time expire (letting
// go of its payouts), hands back the batch already in progress for the asset, and otherwise adds the batch and the payouts it holds.
// `update` holds the batch's row while `decide` runs, and lets go of the payouts of a batch that ended without paying.
export interface BatchRepository {
  create(batch: NewBatch): Promise<CreateBatchResult>;
  get(id: string): Promise<StoredBatch | null>;
  list(limit: number): Promise<readonly StoredBatch[]>;
  update(
    id: string,
    decide: (batch: StoredBatch) => FollowChange | null,
  ): Promise<StoredBatch | null>;
}
