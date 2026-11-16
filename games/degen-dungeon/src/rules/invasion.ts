import { eraOf, invasionEra } from "./calendar.ts";
import { moonPad, visionTicks } from "./constants.ts";
import { priceAt } from "./market.ts";
import type { DayState, Draft, Point } from "./types.ts";

// The saucers. In the mania (story day three), from a quarter of the way through it, four saucers hang over street crossings across the island
// with their beams down, and more circle overhead. Standing still in a beam on foot for a moment (`beamWait`) is being taken up. Aboard,
// glow sticks and a pizza
// (bought that day at the hardware store and the pizza counter) make peace; a bag of the market's meme coin can be shown and traded; or
// the hero goes quietly. Peace or a trade sends the saucers home. Taken up with nothing to offer, or going quietly, ends the day asleep on
// the moon, and the story starts again from the first morning.
export const invasionTick = 4_500;
export const beams: readonly Point[] = [
  { x: 10_800, z: 11_600 },
  { x: 24_400, z: 10_800 },
  { x: 10_800, z: 24_400 },
  { x: 24_400, z: 25_200 },
];
export const beamReach = 300;
export const beamWait = 45;
// What the visitors pay for a bag, against the market's price.
export const tradeTimes = 3;

export const settled = (day: Pick<DayState, "done">): boolean =>
  day.done.includes("contact") || day.done.includes("traded");
export const invading = (
  day: Pick<DayState, "day" | "done" | "tick">,
): boolean =>
  eraOf(day.day) === invasionEra && day.tick >= invasionTick && !settled(day);
export const beamAt = (day: Pick<DayState, "x" | "z">): Point | undefined =>
  beams.find(
    (beam) =>
      Math.max(Math.abs(beam.x - day.x), Math.abs(beam.z - day.z)) <= beamReach,
  );
export const peaceable = (day: Pick<DayState, "done">): boolean =>
  day.done.includes("item-glow") && day.done.includes("item-pizza");

// Taken up with nothing left to say: the day ends asleep on the moon.
export function abducted(day: Draft): void {
  day.x = moonPad.x;
  day.z = moonPad.z;
  day.cause = "abducted";
  day.ended = true;
  day.dir = -1;
  day.gait = 3;
  day.talk = null;
}

// Each tick: standing still on foot in a beam, the hero is taken up, and asked aboard if they have something to offer.
export function invade(day: Draft): void {
  if (
    !invading(day) ||
    day.ended ||
    day.talk !== null ||
    day.ride !== "foot" ||
    day.level > 0 ||
    day.dir >= 0 ||
    beamAt(day) === undefined
  ) {
    day.beamed = 0;
    return;
  }
  day.beamed += 1;
  if (day.beamed < beamWait) return;
  day.beamed = 0;
  if (peaceable(day) || day.bag > 0) day.talk = "abduction";
  else abducted(day);
}

// An answer aboard: "peace", "trade" or "quietly".
export function aboard(day: Draft, name: string): string | null {
  if (name === "peace") {
    if (!peaceable(day)) return "you need glow sticks and a pizza";
    day.done = [...day.done, "contact"];
    day.rep += 100;
    day.vision = Math.max(day.vision, 2 * visionTicks);
    return null;
  }
  if (name === "trade") {
    if (day.bag === 0) return "you have no meme coins to show";
    const value = Math.floor(
      (day.bag * priceAt(day.seed, day.day, day.tick) * tradeTimes) / 100,
    );
    if (value > day.paid) day.made += value - day.paid;
    day.pocket += value;
    day.bag = 0;
    day.paid = 0;
    day.done = [...day.done, "traded"];
    return null;
  }
  abducted(day);
  return null;
}
