import { catchRadius } from "./constants.ts";
import type { Spot } from "./spot.ts";
import type { DayState, Draft, Point } from "./types.ts";
import { inVenue } from "./venues.ts";

// The first morning's errands. Once Frost's speech on the Global DEX steps has broken the riot up, a wallet lies on the street where the
// crowd stood; its owner, Pearl, is shopping in ADOR, the department store across the street, and giving it back to her is the
// morning's second quest (`story.ts`). Stepping back out of ADOR, the hero sees a man snatch Rosa's purse at the door and run east: she
// cries for help, and a hero on foot who catches up with him takes the purse back for her (a side quest). Names, places and numbers are
// a draft for the owner.
export type Errand = "pearl" | "rosa" | "wallet";

export const errandSites: readonly Spot[] = [
  {
    errand: "wallet",
    id: "wallet",
    kind: "talk",
    label: "A dropped wallet",
    node: "wallet",
    on: 1 << 1,
    x: 16_800,
    z: 18_000,
  },
  {
    errand: "pearl",
    id: "pearl",
    kind: "talk",
    label: "Pearl",
    node: "pearl",
    on: 1 << 1,
    x: 21_900,
    z: 15_300,
  },
  {
    errand: "rosa",
    id: "rosa",
    kind: "talk",
    label: "Rosa",
    node: "rosa",
    on: 1 << 1,
    x: 20_600,
    z: 17_400,
  },
];

// Whether an errand's place is there: the wallet once the speech is heard and until it is picked up, Pearl until she has it back, and
// Rosa from the snatch until her purse is back.
export function errandOpen(
  errand: Errand,
  day: Pick<DayState, "done">,
): boolean {
  const has = (id: string): boolean => day.done.includes(id);
  switch (errand) {
    case "wallet":
      return has("speech") && !has("wallet-found");
    case "pearl":
      return !has("wallet-returned");
    case "rosa":
      return has("snatch") && !has("purse-returned");
  }
}

// Where the thief is first seen, a few steps east of ADOR's door, and his way out: east along the street, then south down the avenue,
// where he runs out of breath.
export const thiefStart: Point = { x: 21_600, z: 17_500 };
export const thiefRoute: readonly Point[] = [
  { x: 24_000, z: 17_600 },
  { x: 24_000, z: 22_600 },
];
// Quicker than any walk, slower than any run (`move.ts`: feet go 11 to 15 a tick walking, 17 to 24 running).
export const thiefPace = 15;
export const walletReward = 200;
export const purseReward = 300;

const toward = (from: number, to: number): number =>
  from + Math.max(-thiefPace, Math.min(thiefPace, to - from));

// Each tick of the first morning: the snatch as the hero steps out of ADOR onto the street with Pearl's thanks, the thief running his
// way, and the thief caught by a hero on foot within reach.
export function errandTick(day: Draft): void {
  if (day.day !== 1 || day.loop > 0) return;
  if (
    day.done.includes("wallet-returned") &&
    !day.done.includes("snatch") &&
    !inVenue(day.x, day.z)
  ) {
    day.done = [...day.done, "snatch"];
    day.thief = thiefStart;
    day.thiefLeg = 0;
  }
  const thief = day.thief;
  if (thief === null) return;
  const goal = thiefRoute[day.thiefLeg] ?? thief;
  const now = { x: toward(thief.x, goal.x), z: toward(thief.z, goal.z) };
  day.thief = now;
  if (
    now.x === goal.x &&
    now.z === goal.z &&
    day.thiefLeg + 1 < thiefRoute.length
  )
    day.thiefLeg += 1;
  if (
    day.ride === "foot" &&
    day.level === 0 &&
    Math.max(Math.abs(now.x - day.x), Math.abs(now.z - day.z)) <= catchRadius
  ) {
    day.thief = null;
    day.done = [...day.done, "purse-caught"];
  }
}

// The errands' talks and what their answers do (the words are in `script/lines.ts`).
export const errandNodes: Readonly<
  Record<string, readonly { readonly does?: string; readonly to?: string }[]>
> = {
  pearl: [{ does: "errand-give" }, {}],
  rosa: [{ does: "errand-purse" }, {}],
  wallet: [{ does: "errand-pick" }, {}],
};

export function errandDeed(day: Draft, name: string): string | null {
  const has = (id: string): boolean => day.done.includes(id);
  switch (name) {
    case "errand-pick":
      day.done = [...day.done, "wallet-found"];
      return null;
    case "errand-give":
      if (!has("wallet-found")) return "find her wallet first";
      day.done = [...day.done, "wallet-returned"];
      day.pocket += walletReward;
      day.rep += 10;
      return null;
    case "errand-purse":
      if (!has("purse-caught")) return "catch him first: he ran east";
      day.done = [...day.done, "purse-returned"];
      day.pocket += purseReward;
      day.rep += 15;
      return null;
    default:
      return "nothing to do";
  }
}
