import type {
  ReferralBatch,
  StartReferralBatchResponse,
} from "@frostbite/shared/referrals";
import {
  pastedSignatureMissingCopy,
  walletRefusedCopy,
} from "@frostbite/wallet/client";
import { useCallback, useEffect, useState } from "react";

import type { ReferralsApi } from "../client/api.ts";
import {
  payoutsWords,
  refreshRefusalCopy,
  settledBatch,
  startRefusalCopy,
  submitRefusalCopy,
} from "../domain/batch-copy.ts";

// What the wallet is asked to sign, and what it gives back; none where no wallet can sign, and staff sign elsewhere and paste the result.
export type BatchSigner = (
  transaction: NonNullable<ReferralBatch["toSign"]>,
) => Promise<NonNullable<ReferralBatch["toSign"]> | null>;

export const defaultBatchPollMs = 4_000;

type Skipped = Extract<
  StartReferralBatchResponse,
  { status: "started" }
>["skipped"];

// One batch, from asking for it to its end: built for staff to review, signed (with the wallet, or elsewhere and pasted) and sent, and
// then looked at until the network settles it. The platform decides what each state means; this only asks and shows.
export function useBatch(options: {
  readonly api: ReferralsApi;
  readonly initial: ReferralBatch | null;
  readonly pollMs?: number;
  readonly sign?: BatchSigner | undefined;
}) {
  const { api, initial, sign } = options;
  const pollMs = options.pollMs ?? defaultBatchPollMs;
  const [batch, setBatch] = useState<ReferralBatch | null>(initial);
  const [skipped, setSkipped] = useState<Skipped>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const guarded = useCallback(async (run: () => Promise<void>) => {
    setWorking(true);
    setMessage(null);
    try {
      await run();
    } catch {
      setMessage(payoutsWords.unreachable);
    } finally {
      setWorking(false);
    }
  }, []);

  const build = useCallback(
    (assetKey: string, wallet: string) =>
      guarded(async () => {
        const answer = await api.startBatch({ assetKey, wallet });
        if (answer.status === "refused") {
          setSkipped(answer.skipped);
          setMessage(startRefusalCopy(answer));
          return;
        }
        setBatch(answer.batch);
        setSkipped(answer.skipped);
      }),
    [api, guarded],
  );

  const send = useCallback(
    async (signed: NonNullable<ReferralBatch["toSign"]>) => {
      if (batch === null) return;
      const answer = await api.submitBatch({ batchId: batch.id, signed });
      if (answer.status === "refused") setMessage(submitRefusalCopy(answer));
      else setBatch(answer.batch);
    },
    [api, batch],
  );

  const signWithWallet = useCallback(
    () =>
      guarded(async () => {
        const transaction = batch?.toSign ?? null;
        if (transaction === null || sign === undefined) return;
        let signed: NonNullable<ReferralBatch["toSign"]> | null;
        try {
          signed = await sign(transaction);
        } catch (error) {
          // The wallet was closed or declined, or what it answered could not be used: nothing was sent, and it can be signed again.
          setMessage(walletRefusedCopy(error));
          return;
        }
        if (signed === null) {
          setMessage("Nothing was signed.");
          return;
        }
        await send(signed);
      }),
    [batch, guarded, send, sign],
  );

  // Staff signed elsewhere and pasted the signed payload: it joins the transaction that was shown.
  const sendPasted = useCallback(
    (payload: string) =>
      guarded(async () => {
        const transaction = batch?.toSign ?? null;
        if (transaction === null) return;
        if (payload.trim() === "") {
          setMessage(pastedSignatureMissingCopy);
          return;
        }
        await send({ ...transaction, payload: payload.trim() });
      }),
    [batch, guarded, send],
  );

  // A batch that is not over is looked at until it is: the platform asks the network each time and moves the batch as far as it shows.
  const following =
    batch !== null &&
    batch.state !== "awaiting_signature" &&
    !settledBatch(batch.state);
  const batchId = batch?.id ?? null;
  useEffect(() => {
    if (!following || batchId === null) return undefined;
    const timer = window.setInterval(() => {
      void api
        .refreshBatch({ batchId })
        .then((answer) => {
          if (answer.status === "ok") setBatch(answer.batch);
          else setMessage(refreshRefusalCopy(answer));
        })
        .catch(() => undefined);
    }, pollMs);
    return () => window.clearInterval(timer);
  }, [api, batchId, following, pollMs]);

  return {
    batch,
    build,
    canSign: sign !== undefined,
    dismiss: () => setBatch(null),
    message,
    send: signWithWallet,
    sendPasted,
    skipped,
    working,
  };
}

export type BatchState = ReturnType<typeof useBatch>;
