import { z } from "zod";

// Taking an earning back (REF-1f): an administrator undoes one earning of a referrer, with the reason kept. What it does to the money depends on
// where the earning had got to, and that is stated once here, for the page that warns before it is done and the service that does it:
//  - `pot`: it was in no payout, so it leaves the referrer's pot. Nothing was paid, so nothing is owed back.
//  - `pending-payout`: it is in a payout that has not finished. That payout still goes out as it is, and the same amount is then held back from
//    what they earn next. (If the payout fails, the earning returns to the pot and the take-back removes it there.)
//  - `paid`: it was paid already. It cannot be taken from their wallet, so the same amount is held back from what they earn next.
export const reversalEffects = ["paid", "pending-payout", "pot"] as const;
export type ReversalEffect = (typeof reversalEffects)[number];

// The states of an earning that can be taken back (a reversal is not itself an earning).
export type TakeBackState = "in-payout" | "maturing" | "paid" | "payable";

export function reversalEffectOf(state: TakeBackState): ReversalEffect {
  switch (state) {
    case "maturing":
    case "payable":
      return "pot";
    case "in-payout":
      return "pending-payout";
    case "paid":
      return "paid";
  }
}

export const takeBackInputSchema = z
  .object({
    earningId: z.uuid(),
    reason: z.string().trim().min(1).max(500),
  })
  .strict();
export const takeBackRefusals = [
  "already-taken-back",
  "invalid-reason",
  "not-found",
] as const;
export const takeBackResponseSchema = z.discriminatedUnion("status", [
  z
    .object({ effect: z.enum(reversalEffects), status: z.literal("saved") })
    .strict(),
  z
    .object({
      reason: z.enum(takeBackRefusals),
      status: z.literal("refused"),
    })
    .strict(),
]);

export const takeBackRoute = {
  method: "POST",
  operationId: "takeBackReferralEarning",
  path: "/api/v1/referrals/admin/take-back",
} as const;

export type TakeBackInput = z.infer<typeof takeBackInputSchema>;
export type TakeBackResponse = z.infer<typeof takeBackResponseSchema>;
