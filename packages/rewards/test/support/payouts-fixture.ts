import {
  freshProgram,
  rewards,
  saleEvent,
  sats,
  seedUser,
  startProgram,
} from "./fixture.ts";

export const destination = "sim:one:abc123";
export const ask = (beneficiaryId: string, programKey: string) =>
  rewards.payouts.request({
    assetKey: sats,
    beneficiaryId,
    destination,
    programKey,
  });
export const key = (beneficiaryId: string, programKey: string) => ({
  assetKey: sats,
  beneficiaryId,
  programKey,
});

// A person with one earning of `fee` at 3% under a program with the given minimum and maturity.
export async function earner(
  options: { maturitySeconds?: number; minimumPayout?: bigint } = {},
  fee = 100_000n,
) {
  const referrer = await seedUser();
  const programKey = freshProgram();
  await startProgram(programKey, options);
  await rewards.accrual.accrue(saleEvent(referrer, fee));
  return { programKey, referrer };
}

export async function requested(options: Parameters<typeof earner>[0] = {}) {
  const { programKey, referrer } = await earner(options);
  const result = await ask(referrer, programKey);
  if (result.kind !== "requested")
    throw new Error(`expected a payout, got ${result.kind}`);
  return { payout: result.payout, programKey, referrer };
}
