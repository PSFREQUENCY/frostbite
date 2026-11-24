import { drainPace, nightTick } from "./constants.ts";
import { lofts, type Room } from "./rooms.ts";
import type { Spot } from "./spot.ts";
import type { DayState, Draft, Point } from "./types.ts";

// Each hero's loft (`rooms.ts`): they wake in their bed there on every story day, and their landlord waits on the street by the door.
// Rent is due by nightfall. Unpaid at nightfall, the landlord puts their things out on the kerb: the bed and the freezer, and with them
// any seed paper hidden under the mattress or in the freezer, which whoever finds it uses to drain the wallet until the hideout terminal
// stops it. An evicted hero cannot sleep at home until they pay the rent and a late fee to get back in. A day that ends with the rent
// unpaid (slept on early, or not slept at home at all) is owed the next morning: the hero wakes on the kerb beside their things (the
// `owed` setting, `index.ts`). Once the rent is paid, the landlord sells upgrades in order: a patio by the door, a balcony, and the top
// floor's view of the city, kept from day to day (the `loft` setting). A trip back starts beside a statue, with no rent. Names and
// numbers are a draft for the owner.
export const rents = [100, 150, 200, 250, 400, 600, 0] as const;
export const lateFee = 100;
export const upgrades = [
  ["patio", 500],
  ["balcony", 1_500],
  ["view", 5_000],
] as const;
export const topLoft = upgrades.length;

// Where a hero wakes, in bed at the back of their loft facing the door, and where the landlord stands, on the street a few steps from
// the door.
export const bedOf = (loft: Room): Point => loft.counter;
export const streetOf = (loft: Room, along: number): Point => ({
  x: loft.counter.x + along,
  z: loft.north ? loft.door.z0 - 200 : loft.door.z1 + 200,
});
export const landlordSites: readonly Spot[] = lofts.map((loft, hero) => ({
  ...streetOf(loft, 840),
  id: `landlord-${String(hero)}`,
  kind: "talk",
  label: "The landlord",
  node: "landlord",
  only: hero,
}));

// Where a hero who owes yesterday's rent wakes: on the kerb by the door, beside their things, locked out.
export const kerbOf = (hero: number): Pick<DayState, "done" | "x" | "z"> => {
  const loft = lofts[hero];
  const kerb = loft === undefined ? { x: 0, z: 0 } : streetOf(loft, -300);
  return { done: ["evicted"], ...kerb };
};

export const rentOf = (day: Pick<DayState, "day" | "loop">): number =>
  day.loop > 0 ? 0 : (rents[day.day - 1] ?? 0);
export const rentDue = (
  day: Pick<DayState, "day" | "done" | "loop">,
): boolean => rentOf(day) > 0 && !day.done.includes("rent-paid");
export const evicted = (day: Pick<DayState, "done">): boolean =>
  day.done.includes("evicted") && !day.done.includes("back-in");

// Each tick: at nightfall, unpaid rent puts the hero's things on the kerb, and a seed paper hidden in the bed or the freezer is found.
export function rentTick(day: Draft): void {
  if (day.tick < nightTick || !rentDue(day) || day.done.includes("evicted"))
    return;
  day.done = [...day.done, "evicted"];
  if (day.paper === 2 || day.paper === 4)
    day.drain = Math.max(day.drain, drainPace);
}

// Why the hero cannot go to bed now, or null: locked out.
export const lockedOut = (day: Pick<DayState, "done">): string | null =>
  evicted(day)
    ? "your things are out on the kerb: pay the landlord to get back in"
    : null;

// Which of the landlord's talks opens: getting back in, the rent, or the upgrades once it is paid.
export const landlordNode = (
  day: Pick<DayState, "day" | "done" | "loop">,
): string =>
  evicted(day) ? "landlord-out" : rentDue(day) ? "landlord" : "landlord-up";

export const loftNodes: Readonly<
  Record<string, readonly { readonly does?: string; readonly to?: string }[]>
> = {
  landlord: [{ does: "loft-rent" }, {}],
  "landlord-out": [{ does: "loft-back" }, {}],
  "landlord-up": [
    ...upgrades.map(([name]) => ({
      does: `loft-${name}`,
      to: "landlord-up",
    })),
    {},
  ],
};

const pay = (day: Draft, cost: number, ...done: string[]): string | null => {
  if (day.pocket < cost) return "not enough DUN";
  day.pocket -= cost;
  day.done = [...day.done, ...done];
  return null;
};

export function loftDeed(day: Draft, name: string): string | null {
  if (name === "loft-rent") return pay(day, rentOf(day), "rent-paid");
  if (name === "loft-back")
    return pay(day, rentOf(day) + lateFee, "rent-paid", "back-in");
  const level = upgrades.findIndex(([upgrade]) => `loft-${upgrade}` === name);
  if (level < 0) return "nothing to do";
  if (day.loft > level) return "your loft has that already";
  if (day.loft < level) return "one upgrade at a time, in order";
  const failed = pay(day, upgrades[level]?.[1] ?? 0);
  if (failed === null) day.loft = level + 1;
  return failed;
}
