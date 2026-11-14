import { TransactionLink } from "@frostbite/feature-chain-status/transaction";
import type { ReferralBatch } from "@frostbite/shared/referrals";
import { ActionProgress, ArcadeTextField, KeyValueList } from "@repo/ui/arcade";

import {
  batchStateWords,
  skippedWords,
  totalLine,
} from "../domain/batch-copy.ts";
import { unitsLabel, whenLabel } from "../domain/format.ts";
import type { BatchState } from "./use-batch.ts";

// What a batch is, for the review staff sign from: where it stands, each payment (who is paid and how much), the sum and the network fee,
// apart from the rest because it is what is being agreed to. It shows exactly what the platform built (the wallet signs that, and the
// platform refuses anything else), and it never says it is paid before the network's records show it. Without a wallet that signs, the
// transaction to sign elsewhere and a box for the signed result.
export function BatchReview({
  batch,
  canSign,
  message,
  onPaste,
  pasted,
  skipped,
}: {
  readonly batch: ReferralBatch;
  readonly canSign: boolean;
  readonly message: string | null;
  readonly onPaste: (payload: string) => void;
  readonly pasted: string;
  readonly skipped: BatchState["skipped"];
}) {
  const words = batchStateWords[batch.state];
  return (
    <div
      className="review-stack"
      data-state={batch.state}
      data-testid="batch-review"
    >
      <ActionProgress
        detail={`${words.detail}${batch.failureReason === null ? "" : ` (${batch.failureReason})`}`}
        title={words.label}
        working={batch.state === "pending" || batch.state === "confirmed"}
      />
      <KeyValueList
        items={[
          { label: "Payments", value: totalLine(batch) },
          {
            label: "Network fee",
            value: `${unitsLabel(batch.feeUnits)}, paid by the wallet that signs`,
          },
          { label: "Valid until", value: whenLabel(new Date(batch.expiresAt)) },
          {
            label: "Sent",
            value:
              batch.sentAt === null ? null : whenLabel(new Date(batch.sentAt)),
          },
        ]}
        label="What this batch does"
      />
      <ul aria-label="Who is paid" className="console-list">
        {batch.payments.map((payment, at) => (
          <li
            className="console-row"
            key={`${payment.recipient}-${String(at)}`}
          >
            <span className="console-row__text">
              <span className="console-row__name">
                {unitsLabel(payment.units)}
              </span>
              <small className="console-row__detail">{`to ${payment.recipient}`}</small>
            </span>
          </li>
        ))}
      </ul>
      {skipped.length === 0 ? null : (
        <ul aria-label="Left out" className="ref-note">
          {skipped.map(({ payoutId, reason }) => (
            <li
              key={payoutId}
            >{`A payout ${skippedWords[reason]}: it stays waiting.`}</li>
          ))}
        </ul>
      )}
      {batch.transactionId === null ? null : (
        <p>
          <TransactionLink id={batch.transactionId} />
        </p>
      )}
      {message === null ? null : <p role="alert">{message}</p>}
      {batch.toSign === null || canSign ? null : (
        <div className="step-review__elsewhere">
          <p>
            No wallet that can sign is connected. Sign this transaction
            elsewhere and paste the signed result.
          </p>
          <label className="arcade-field">
            <span>Transaction to sign</span>
            <textarea readOnly rows={4} value={batch.toSign.payload} />
          </label>
          <ArcadeTextField
            label="Signed transaction"
            multiline
            onChange={onPaste}
            value={pasted}
          />
        </div>
      )}
    </div>
  );
}
