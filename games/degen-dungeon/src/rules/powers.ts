import { roll } from "./coin.ts";
import { heatPerStar, powerCooldown } from "./constants.ts";
import { isFrozen, mostFrozen, targetsOf, thawTicks } from "./freeze.ts";
import { onTheRoof } from "./climb.ts";
import { flying, land, powerLevel, takeOff } from "./flight.ts";
import { units } from "./move.ts";
import { openTo, spots } from "./places.ts";
import type { DayState, Draft, Point } from "./types.ts";
import { onStreet } from "./world.ts";
import { topFloor } from "./haus.ts";

// Every hero's own power (`view/powers.ts`), used with one button and then cooling for twenty seconds, stronger at each level: level one
// to start, then one more for each top skill mastered today, up to three (`mastery.ts`). The ram charges and senses S's nearest letter
// (S, who signs as Satoshi); the dragon flies, low at first and then high, longer at each level (`flight.ts`); the miner digs anywhere and now and then turns up a gem; the ice giant
// breathes frost that freezes whoever is close ahead; the wizard blinks a few metres; the dog and the cat see with frost vision, the cat
// for longer; the bull charges; the bear's strength stops the tux and the beat cop in their tracks; and the unicorn's shimmer cools a
// star of heat. A draft for the owner.
export type Power =
  | "blink"
  | "breath"
  | "charge"
  | "dig"
  | "fly"
  | "sense"
  | "shimmer"
  | "sight"
  | "strength"
  | "vision";
export const powers: readonly Power[] = [
  "sense",
  "fly",
  "dig",
  "breath",
  "blink",
  "vision",
  "sight",
  "charge",
  "strength",
  "shimmer",
];

export const powerOf = (hero: number): Power => powers[hero] ?? "vision";
export { powerLevel };
export const powerReady = (day: Pick<DayState, "powerAt" | "tick">): boolean =>
  day.tick - day.powerAt >= powerCooldown;

// Whatever is within `far` ahead of the hero and a metre and a half either side.
const ahead = (
  day: Pick<DayState, "facing" | "x" | "z">,
  at: Point,
  far: number,
): boolean => {
  const [east, south] = units[day.facing] ?? [0, 1_024];
  const dx = at.x - day.x;
  const dz = at.z - day.z;
  const along = Math.trunc((dx * east + dz * south) / 1_024);
  const aside = Math.abs(Math.trunc((dx * south - dz * east) / 1_024));
  return along > 0 && along <= far && aside <= 150;
};
// A leap ahead, as far as it can land on open street.
function leap(day: Draft, far: number): string | null {
  const [east, south] = units[day.facing] ?? [0, 1_024];
  for (let step = far; step >= 200; step -= 100) {
    const x = day.x + Math.trunc((east * step) / 1_024);
    const z = day.z + Math.trunc((south * step) / 1_024);
    if (onStreet(x, z)) {
      day.x = x;
      day.z = z;
      return null;
    }
  }
  return "nowhere open to land that way";
}
// S's nearest letter still lying on today's avenues.
export const letterNear = (day: DayState): Point | null =>
  spots
    .filter(
      (spot) =>
        spot.kind === "letter" &&
        openTo(spot, day) &&
        !day.done.includes(spot.id),
    )
    .reduce<Point | null>(
      (best, spot) =>
        best === null ||
        Math.abs(spot.x - day.x) + Math.abs(spot.z - day.z) <
          Math.abs(best.x - day.x) + Math.abs(best.z - day.z)
          ? { x: spot.x, z: spot.z }
          : best,
      null,
    );

export function usePower(day: Draft): string | null {
  if (day.talk !== null) return "answer first";
  // In the air, the power again brings the dragon down.
  if (flying(day)) {
    land(day);
    return null;
  }
  const power = powerOf(day.hero);
  // The dragon may take off from a roof too, and from Haus De Savage's rooftop; no other power works up in the tower.
  const fromRoof =
    power === "fly" && (onTheRoof(day) || day.floor === topFloor);
  if (
    !fromRoof &&
    (day.ride !== "foot" ||
      day.level !== 0 ||
      day.line !== null ||
      day.floor > 0 ||
      day.elevator !== null)
  )
    return "your power needs your own feet on the ground";
  if (!powerReady(day)) return "your power is still charging";
  const level = powerLevel(day);
  const missed =
    power === "fly"
      ? takeOff(day)
      : power === "blink"
        ? leap(day, 500 * level)
        : null;
  if (missed !== null) return missed;
  day.powerAt = day.tick;
  switch (power) {
    case "sense":
    case "charge":
      day.boostUntil = day.tick + 45 * level;
      if (power === "sense") day.senseUntil = day.tick + 300 * level;
      return null;
    case "vision":
    case "sight":
      day.vision += (power === "sight" ? 600 : 300) * level;
      day.looking = true;
      return null;
    case "dig": {
      const find = roll(day.seed, day.tick, 6);
      if (find === 0) {
        day.pocket += 500 * level;
        day.done = [...day.done, `gem-${String(day.tick)}`];
      } else if (find < 3) day.pocket += 50 * level;
      return null;
    }
    case "breath":
    case "strength": {
      const caught = targetsOf(day)
        .filter(({ struck }) => power === "breath" || struck === "chaser")
        .filter((target) =>
          power === "breath"
            ? ahead(day, target, 300 + 200 * level)
            : Math.max(
                Math.abs(target.x - day.x),
                Math.abs(target.z - day.z),
              ) <= 800,
        )
        .filter(({ id }) => !isFrozen(day, id))
        .slice(0, Math.max(0, mostFrozen - day.frozen.length));
      const until =
        day.tick + (power === "breath" ? thawTicks / 3 : 150 * level);
      day.frozen = [...day.frozen, ...caught.map(({ id }) => ({ id, until }))];
      day.peakFrozen = Math.max(day.peakFrozen, day.frozen.length);
      return null;
    }
    case "shimmer":
      day.heat = Math.max(0, day.heat - heatPerStar * level);
      return null;
    default:
      return null;
  }
}
