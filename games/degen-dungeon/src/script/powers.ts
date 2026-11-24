import type { Power } from "../rules/powers.ts";

// Each hero's power by name, on its button with its level (`rules/powers.ts`). A draft for the owner.
export const powerNames: Readonly<Record<Power, string>> = {
  blink: "Blink",
  breath: "Frost breath",
  charge: "Super charge",
  dig: "Dig",
  fly: "Fly",
  sense: "Charge, sense S",
  shimmer: "Shimmer",
  sight: "Cat sight",
  strength: "Bear strength",
  vision: "Sniff out",
};
// Pip's line while the dragon flies (`rules/flight.ts`).
export const flyingLine = (left: number): string =>
  `Flying! ${String(left)} seconds left in the air: use your power again to land.`;
