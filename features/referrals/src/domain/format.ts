// How the program's figures are written for people. Amounts are whole units of the chain's smallest denomination (the satoshi), written with
// grouped digits; a share is written in percent, to the hundredth only when it has one; a wait is written in its largest whole unit.

const unitName = "sats";

export const unitsLabel = (units: bigint | string): string =>
  `${BigInt(units).toLocaleString("en-US")} ${unitName}`;

// 300 hundredths of a percent is "3%"; 250 is "2.5%"; 5 is "0.05%".
export function percentLabel(basisPoints: number): string {
  const percent = basisPoints / 100;
  return `${Number.isInteger(percent) ? String(percent) : percent.toFixed(2).replace(/0$/u, "")}%`;
}

const secondsIn = { day: 86_400, hour: 3_600, minute: 60 } as const;

// 0 is "no wait"; 3,600 is "1 hour"; 90 is "90 seconds" (a figure that is not a whole number of a larger unit stays in the smaller).
export function waitLabel(seconds: number): string {
  if (seconds === 0) return "no wait";
  for (const [name, size] of Object.entries(secondsIn))
    if (seconds % size === 0) {
      const count = seconds / size;
      return `${String(count)} ${name}${count === 1 ? "" : "s"}`;
    }
  return `${String(seconds)} second${seconds === 1 ? "" : "s"}`;
}

// "2026-11-14 12:00 UTC": the same reading everywhere.
export const whenLabel = (date: Date): string =>
  `${date.toISOString().slice(0, 16).replace("T", " ")} UTC`;

// A share of a fee, worked out as the ledger works it out: rounded down.
export const shareOf = (fee: bigint, basisPoints: number): bigint =>
  (fee * BigInt(basisPoints)) / 10_000n;
