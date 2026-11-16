import { beforeAll } from "vitest";

import { referralProgramKey } from "../../src/kind.ts";
import { addressOf, batches, signSimulated, sim } from "./batches.ts";
import { chain, clock, feeAsset, referrals, seedUser } from "./fixture.ts";

// What the tests of the batch service share: the paying address, a way to start a batch as staff, and a way to begin from nothing waiting.
export const treasury = addressOf("a1b2c3");
sim.controls.fund(chain, treasury, 1_000_000n);
// The staff member who builds the batches of the file that registers one.
export const staff = { id: "" };
export function registerStaff(): void {
  beforeAll(async () => {
    staff.id = await seedUser();
  });
}
export const start = (over: object = {}) =>
  batches.start({
    assetKey: feeAsset,
    sender: treasury,
    staffId: staff.id,
    ...over,
  });
export const stateOf = async (payoutId: string) =>
  (await referrals.rewards.payouts.payout(payoutId))?.state;
export const need = async (result: ReturnType<typeof start>) => {
  const answer = await result;
  if (!answer.ok) throw new Error(`not started: ${answer.code}`);
  return answer;
};
export const sign = (batch: {
  unsigned: Parameters<typeof signSimulated>[0];
}) => signSimulated(batch.unsigned);
// Starts a test from nothing owed and no batch in progress: payouts that are still waiting are cancelled, and a batch that was never signed
// is let lapse (the clock goes past its time; a batch already sent is followed to its end by the test that sent it).
export async function clearQueue() {
  for (const payout of await referrals.rewards.payouts.requestedIn(
    feeAsset,
    referralProgramKey,
    500,
  ))
    await referrals.rewards.payouts.cancel(payout.id, { reason: "test" });
  const lapse = (await batches.list(50)).reduce(
    (latest, { expiresAt, state }) =>
      state === "awaiting_signature" && expiresAt.getTime() > latest
        ? expiresAt.getTime()
        : latest,
    clock.now.getTime(),
  );
  clock.now = new Date(lapse + 1_000);
}
