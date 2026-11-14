import {
  afterBroadcast,
  afterObservation,
  isObservable,
  moveTo,
  signedOf,
  type ChainRef,
  type DelayPolicy,
  type SignedTransaction,
  type TrackedState,
  type UnsignedTransaction,
} from "@frostbite/shared/chain";

import type {
  Broadcaster,
  ChainObserver,
  TransactionBuilder,
} from "./ports.ts";

// What a record of a transaction the platform built, had signed and follows to the chain holds, as far as following it goes.
export interface FollowedRecord {
  readonly broadcastAt: Date | null;
  readonly chain: ChainRef;
  readonly expiresAt: Date;
  readonly id: string;
  readonly signedPayload: string | null;
  readonly state: TrackedState;
  readonly transactionId: string | null;
  readonly unsigned: UnsignedTransaction;
}

// What a move writes to a record: the state it goes to and what goes with it.
export interface FollowChange {
  readonly failureReason?: string | null;
  readonly signedPayload?: string;
  readonly state: TrackedState;
  readonly submittedBy?: string;
  readonly transactionId?: string;
}

export interface FollowedPorts {
  readonly broadcaster: Pick<Broadcaster, "broadcast">;
  readonly builder: Pick<TransactionBuilder, "verifySigned">;
  readonly observer: Pick<ChainObserver, "observe">;
}

export interface FollowerDependencies<Record extends FollowedRecord> {
  readonly clock: () => Date;
  readonly delay: Pick<DelayPolicy, "maxUnsettledMs">;
  readonly get: (id: string) => Promise<Record | null>;
  // The chain's ports, or none for a chain the platform does not serve.
  readonly ports: (chain: ChainRef) => FollowedPorts | null;
  // Holds the record's row while `decide` runs and writes what it answers, so two moves on one transaction never overwrite each other; the
  // record as it is after, or null when there is none.
  readonly update: (
    id: string,
    decide: (record: Record) => FollowChange | null,
  ) => Promise<Record | null>;
}

export type SubmitResult<Record> =
  | { readonly ok: true; readonly record: Record }
  | {
      readonly code:
        | "chain-unavailable"
        | "expired"
        | "invalid-signature"
        | "not-awaiting-signature"
        | "not-found";
      readonly ok: false;
      readonly reason?: string;
    };

export type RefreshResult<Record> =
  | { readonly ok: true; readonly record: Record }
  | {
      readonly code: "chain-unavailable" | "not-found";
      readonly ok: false;
    };

// What a record that never reached the network says when it is given up.
export const neverReceivedReason =
  "The network never received it, although the platform looked and sent it again for over an hour. Nothing was spent.";

// Taking a built transaction from a signature to the chain: what was signed is checked against what was built and sent once (asking again
// sends the same bytes and the network gives the same id), and the record is followed until the network confirms or refuses it. Whatever the
// record is for (a game's step, a batch of payouts) is told of how it ended by the one that follows it.
export function createFollower<Record extends FollowedRecord>(
  dependencies: FollowerDependencies<Record>,
) {
  const { clock, delay, get, ports, update } = dependencies;

  // Sends a signed record to the network. `from` is where it stands: signed, or sent without the network being seen to hold it.
  async function broadcast(
    record: Record,
    chain: FollowedPorts,
    from: "broadcast_unknown" | "signed" = "signed",
  ): Promise<Record | null> {
    const signed = signedOf(record);
    if (signed === null) return record;
    const change = afterBroadcast(await chain.broadcaster.broadcast(signed));
    return change === null ? record : update(record.id, moveTo(from, change));
  }

  // A record the network has not been seen to hold, after the time any wait is called delayed, is over.
  async function givenUp(record: Record): Promise<Record | null> {
    const since = record.broadcastAt;
    if (
      since === null ||
      clock().getTime() - since.getTime() <= delay.maxUnsettledMs
    )
      return record;
    return update(
      record.id,
      moveTo("broadcast_unknown", {
        failureReason: neverReceivedReason,
        state: "broadcast_rejected",
      }),
    );
  }

  return {
    // The signed transaction, checked against what was built, kept with who sent it, and sent. The same signed bytes again return the
    // record as it is; different ones are refused.
    async submit(input: {
      readonly id: string;
      readonly signed: SignedTransaction;
      readonly submittedBy: string;
    }): Promise<SubmitResult<Record>> {
      const { id, signed, submittedBy } = input;
      const outcome: { refusal: SubmitResult<Record> | null } = {
        refusal: null,
      };
      const accepted = await update(id, (record) => {
        if (record.state !== "awaiting_signature") {
          outcome.refusal =
            record.signedPayload === signed.payload
              ? null
              : { code: "not-awaiting-signature", ok: false };
          return null;
        }
        if (clock() >= record.expiresAt) {
          outcome.refusal = { code: "expired", ok: false };
          return { state: "expired" };
        }
        const chain = ports(record.chain);
        if (chain === null) {
          outcome.refusal = { code: "chain-unavailable", ok: false };
          return null;
        }
        const verified = chain.builder.verifySigned(record.unsigned, signed);
        if (!verified.ok) {
          outcome.refusal = {
            code: "invalid-signature",
            ok: false,
            reason: verified.reason,
          };
          return null;
        }
        return { signedPayload: signed.payload, state: "signed", submittedBy };
      });
      if (accepted === null) return { code: "not-found", ok: false };
      if (outcome.refusal !== null) return outcome.refusal;
      const chain = ports(accepted.chain);
      if (chain === null || accepted.state !== "signed")
        return { ok: true, record: accepted };
      try {
        return {
          ok: true,
          record: (await broadcast(accepted, chain)) ?? accepted,
        };
      } catch {
        return { code: "chain-unavailable", ok: false };
      }
    },

    // Looks at the chain once and moves the record as far as the evidence allows; safe to call as often as wanted. `confirmed` says what a
    // record that the network confirms becomes (complete, or failed to be recognised); it is asked only of a confirmed record.
    async refresh(
      id: string,
      confirmed: (record: Record) => FollowChange | null,
    ): Promise<RefreshResult<Record>> {
      const record = await get(id);
      if (record === null) return { code: "not-found", ok: false };
      const chain = ports(record.chain);
      if (chain === null) return { code: "chain-unavailable", ok: false };
      const view = (held: Record | null): RefreshResult<Record> => ({
        ok: true,
        record: held ?? record,
      });
      try {
        if (record.state === "signed")
          return view(await broadcast(record, chain));
        if (record.state === "awaiting_signature")
          return view(
            await update(id, (held) =>
              held.state === "awaiting_signature" && clock() >= held.expiresAt
                ? { state: "expired" }
                : null,
            ),
          );
        if (record.state === "confirmed")
          return view(await update(id, confirmed));
        if (record.transactionId === null || !isObservable(record.state))
          return view(record);
        const from = record.state;
        const observation = await chain.observer.observe({
          chain: record.chain,
          id: record.transactionId,
        });
        // Sent, but the network does not have it: the same bytes are sent again, so a record is not left waiting for a transaction that
        // never arrived. Taken or refused, the outcome is told as it is.
        if (
          from === "broadcast_unknown" &&
          observation.status === "not-found"
        ) {
          const sent = (await broadcast(record, chain, from)) ?? record;
          return view(sent.state === from ? await givenUp(sent) : sent);
        }
        const next = afterObservation(from, observation);
        return next === null
          ? view(record)
          : view(await update(id, moveTo(from, next)));
      } catch {
        return { code: "chain-unavailable", ok: false };
      }
    },
  };
}

export type Follower<Record extends FollowedRecord> = ReturnType<
  typeof createFollower<Record>
>;
