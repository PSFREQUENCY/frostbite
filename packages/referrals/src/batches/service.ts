import {
  BuildRefusedError,
  InvalidAddressError,
  type ContractGateway,
  type TransactionBuilder,
} from "@frostbite/chain/ports";
import { createFollower, type FollowedPorts } from "@frostbite/chain/follower";
import { assetOfKey, chainOfAssetKey, type Rewards } from "@frostbite/rewards";
import {
  chainRefSchema,
  indexed,
  maxBatchPayments,
  moveTo,
  type Address,
  type BatchPayment,
  type ChainRef,
  type FeeSpeed,
  type FundingPolicy,
  type SignedTransaction,
} from "@frostbite/shared/chain";
import { maxAdminPayloadChars } from "@frostbite/shared/games";

import { referralProgramKey } from "../kind.ts";
import type { BatchRepository, StoredBatch } from "./types.ts";

// The executor a payout is handed to once its batch is signed: staff, by the batch.
export const batchExecutorId = "staff-batch";

// What a batch needs of a chain: to check where a payment goes and what it may carry, to build, check and send the transaction, to see
// whether the sender can afford it, and to follow it.
export interface BatchChainPorts extends FollowedPorts {
  readonly addressCodec: {
    minimumOutput(address: Address): bigint;
    parse(chain: ChainRef, text: string): Address;
  };
  readonly builder: Pick<TransactionBuilder, "build" | "verifySigned">;
  readonly contracts: Pick<ContractGateway, "simulate">;
}

export interface BatchDependencies {
  readonly clock: () => Date;
  readonly delay: { readonly maxUnsettledMs: number };
  // What a batch may cost the sender in network fee, on the chain.
  readonly funding: (chain: ChainRef) => FundingPolicy;
  readonly newId: () => string;
  // The chain's ports, or none for a chain the platform does not serve.
  readonly ports: (chain: ChainRef) => BatchChainPorts | null;
  readonly repository: BatchRepository;
  readonly rewards: Pick<Rewards, "payouts">;
}

// A payout left out of a batch, and why: it is under what the network would relay to its address, or its address is not one the chain
// accepts. It stays waiting.
export interface SkippedPayout {
  readonly payoutId: string;
  readonly reason: "dust" | "invalid-address";
}

export type StartBatchResult =
  | {
      readonly batch: StoredBatch;
      readonly ok: true;
      readonly resumed: boolean;
      readonly skipped: readonly SkippedPayout[];
    }
  | {
      readonly code:
        | "chain-unavailable"
        | "could-not-build"
        | "cannot-pay"
        | "costs-more-than-it-pays"
        | "invalid-sender"
        | "nothing-to-pay";
      readonly ok: false;
      readonly reason?: string;
      readonly skipped?: readonly SkippedPayout[];
    };

const sum = (payments: readonly BatchPayment[]): bigint =>
  payments.reduce((total, { amount }) => total + amount.baseUnits, 0n);

// The staff side of paying referrers (ADR-026): one transaction that pays every payout waiting for a batch, built for staff to check and
// sign with the wallet that pays, sent once, and followed until the network confirms it. The ledger follows the batch: a payout is handed over
// when its batch is signed, is complete when the batch is, and goes back to the pot (to be asked for again) only when the batch is known not to
// have paid. The sender pays the network's fee, so a referrer is paid every unit of what they asked for.
export function createBatches(dependencies: BatchDependencies) {
  const { clock, funding, newId, ports, repository, rewards } = dependencies;

  const follower = createFollower<StoredBatch>({
    clock,
    delay: dependencies.delay,
    get: (id) => repository.get(id),
    ports,
    update: (id, decide) => repository.update(id, decide),
  });

  // Makes the ledger say what the batch has done: its payouts are handed over once it is signed, paid when it is complete, and failed (their
  // entries back in the pot) when it ended without paying. Every move is safe to repeat, so a crash between the two is made good by the next
  // look at the batch.
  async function reconcile(batch: StoredBatch): Promise<void> {
    const payouts = await rewards.payouts.many(batch.payoutIds);
    for (const payout of payouts) {
      switch (batch.state) {
        case "signed":
        case "broadcast_unknown":
        case "broadcast_accepted":
        case "pending":
        case "confirmed":
          if (payout.state === "requested")
            await rewards.payouts.begin(payout.id, {
              actorId: batch.submittedBy,
              executor: batchExecutorId,
            });
          break;
        case "complete":
          if (payout.state === "requested")
            await rewards.payouts.begin(payout.id, {
              actorId: batch.submittedBy,
              executor: batchExecutorId,
            });
          if (batch.transactionId !== null)
            await rewards.payouts.complete(payout.id, {
              actorId: batch.submittedBy,
              ref: batch.transactionId,
            });
          break;
        case "broadcast_rejected":
        case "indexed_failure":
          if (payout.state === "in_progress")
            await rewards.payouts.fail(payout.id, {
              actorId: batch.submittedBy,
              reason: batch.failureReason ?? "the batch did not pay",
            });
          break;
        default:
          break;
      }
    }
  }

  return {
    // Builds the batch for staff to sign: the payouts waiting in the asset (oldest first, or the ones named), each to its own address, paid
    // by `sender`. Asking again for a batch in progress returns it. Nothing is stored for a batch that cannot be paid, and nothing about the
    // ledger changes until it is signed.
    async start(input: {
      readonly assetKey: string;
      readonly feeSpeed?: FeeSpeed;
      readonly payoutIds?: readonly string[];
      readonly sender: string;
      readonly staffId: string;
    }): Promise<StartBatchResult> {
      const asset = assetOfKey(input.assetKey);
      const chain = chainRefSchema.safeParse(chainOfAssetKey(input.assetKey));
      if (asset === null || !chain.success)
        return { code: "chain-unavailable", ok: false };
      const served = ports(chain.data);
      if (served === null) return { code: "chain-unavailable", ok: false };
      let sender: Address;
      try {
        sender = served.addressCodec.parse(chain.data, input.sender);
      } catch (error) {
        if (error instanceof InvalidAddressError)
          return { code: "invalid-sender", ok: false };
        return { code: "chain-unavailable", ok: false };
      }

      const waiting = (
        await rewards.payouts.requestedIn(
          input.assetKey,
          referralProgramKey,
          maxBatchPayments * 2,
        )
      ).filter(
        ({ id }) =>
          input.payoutIds === undefined || input.payoutIds.includes(id),
      );
      const payments: BatchPayment[] = [];
      const taken: string[] = [];
      const skipped: SkippedPayout[] = [];
      for (const payout of waiting) {
        if (payments.length === maxBatchPayments) break;
        let recipient: Address;
        try {
          recipient = served.addressCodec.parse(chain.data, payout.destination);
        } catch {
          skipped.push({ payoutId: payout.id, reason: "invalid-address" });
          continue;
        }
        if (payout.amount < served.addressCodec.minimumOutput(recipient)) {
          skipped.push({ payoutId: payout.id, reason: "dust" });
          continue;
        }
        payments.push({
          amount: { asset, baseUnits: payout.amount },
          recipient,
        });
        taken.push(payout.id);
      }
      if (payments.length === 0)
        return { code: "nothing-to-pay", ok: false, skipped };

      const intent = {
        chain: chain.data,
        ...(input.feeSpeed === undefined ? {} : { feeSpeed: input.feeSpeed }),
        operation: "pay-batch" as const,
        payments,
        sender,
      };
      const simulated = await served.contracts.simulate(intent);
      if (!simulated.ok)
        return {
          code: "cannot-pay",
          ok: false,
          reason: simulated.reason,
          skipped,
        };
      let unsigned;
      try {
        unsigned = await served.builder.build(intent, funding(chain.data));
      } catch (error) {
        return {
          code: "could-not-build",
          ok: false,
          reason: error instanceof BuildRefusedError ? error.code : undefined,
          skipped,
        };
      }
      // A batch that costs the platform more in network fee than it pays out is not worth sending: it is left for more to join it.
      if (unsigned.summary.fee.baseUnits >= sum(payments))
        return { code: "costs-more-than-it-pays", ok: false, skipped };
      if (unsigned.payload.length > maxAdminPayloadChars)
        return {
          code: "could-not-build",
          ok: false,
          reason: "payload-too-large",
          skipped,
        };
      const created = await repository.create({
        assetKey: input.assetKey,
        chain: chain.data,
        createdAt: clock(),
        createdBy: input.staffId,
        expiresAt: new Date(unsigned.summary.expiresAt),
        id: newId(),
        payoutIds: taken,
        unsigned,
      });
      return {
        batch: created.batch,
        ok: true,
        resumed: created.kind === "in-progress",
        skipped,
      };
    },

    // Staff signed what they were shown: checked against what was built, kept with who sent it, sent to the network, and the payouts handed
    // over. The same signed bytes again return the batch as it is; different ones are refused.
    async submit(input: {
      readonly batchId: string;
      readonly signed: SignedTransaction;
      readonly staffId: string;
    }) {
      const result = await follower.submit({
        id: input.batchId,
        signed: input.signed,
        submittedBy: input.staffId,
      });
      if (result.ok) await reconcile(result.record);
      return result;
    },

    // Looks at the chain once and moves the batch as far as the evidence allows, and the ledger with it. Safe to call as often as wanted.
    async refresh(batchId: string) {
      const result = await follower.refresh(batchId, (held) =>
        moveTo("confirmed", { state: indexed })(held),
      );
      if (result.ok) {
        const settled = result.record;
        await reconcile(settled);
      }
      return result;
    },

    get: (batchId: string) => repository.get(batchId),
    list: (limit = 20) => repository.list(limit),
  };
}

export type Batches = ReturnType<typeof createBatches>;
