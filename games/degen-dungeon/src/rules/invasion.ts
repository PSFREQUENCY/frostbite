import { eraOf, invasionEra } from "./calendar.ts";
import { moonPad, visionTicks } from "./constants.ts";
import { priceAt } from "./market.ts";
import type { DayState, Draft, Point } from "./types.ts";

// The saucers. In the mania (story day three), from a quarter of the way through it, four saucers hang over street crossings across the
// island with their beams down, and more circle overhead. Standing still in a beam on foot for a moment (`beamWait`) is being taken up.
// Aboard, glow sticks and a pizza (bought that day at the hardware store and the pizza counter) make peace; a bag of the market's meme
// coin can be shown and traded; or the hero goes quietly. Taken up with nothing to offer, or going quietly, ends the day asleep on the
// moon, and the story starts again from the first morning. The first peace or trade ends the alarm, and the saucer it was made with flies
// home; the other three stay as visitors, and on every later day they come back as friends at the same hour. A visitor only takes up a
// hero with something to offer, and its third answer is just to be set down. Each peace or trade is a beam-up (one a saucer a day):
// thirteen of them, counted over the days (`beamups`, the page's word), and the visitors leave the hero a saucer of their own to fly.
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

export const saucerBeamups = 13;
// The beam-up made with saucer `index` today, and how many were made today.
export const beamupOf = (index: number): string => `beamup-${String(index)}`;
export const beamupsToday = (day: Pick<DayState, "done">): number =>
  day.done.filter((id) => id.startsWith("beamup-")).length;
// Whether the saucer of their own is the hero's: thirteen beam-ups, earlier days' and today's together.
export const saucerOpen = (day: Pick<DayState, "beamups" | "done">): boolean =>
  day.beamups + beamupsToday(day) >= saucerBeamups;

export const settled = (day: Pick<DayState, "done">): boolean =>
  day.done.includes("contact") || day.done.includes("traded");
// The alarm of the mania, until the first peace or trade.
export const invading = (
  day: Pick<DayState, "day" | "done" | "tick">,
): boolean =>
  eraOf(day.day) === invasionEra && day.tick >= invasionTick && !settled(day);
// Whether saucers hang over the city: in the mania and on every story day after it, from the same hour.
export const visiting = (
  day: Pick<DayState, "day" | "loop" | "tick">,
): boolean =>
  day.loop === 0 && eraOf(day.day) >= invasionEra && day.tick >= invasionTick;
// The beam the hero stands in, by its saucer's index (-1 for none); a saucer already visited today has flown home.
export const beamIndexAt = (day: Pick<DayState, "done" | "x" | "z">): number =>
  beams.findIndex(
    (beam, index) =>
      !day.done.includes(beamupOf(index)) &&
      Math.max(Math.abs(beam.x - day.x), Math.abs(beam.z - day.z)) <= beamReach,
  );
export const beamAt = (
  day: Pick<DayState, "done" | "x" | "z">,
): Point | undefined => beams[beamIndexAt(day)];
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

// Each tick: standing still on foot in a beam, the hero is taken up, and asked aboard if they have something to offer. In the alarm a hero
// with nothing is taken all the same; a visitor leaves them be.
export function invade(day: Draft): void {
  if (
    !visiting(day) ||
    day.ended ||
    day.talk !== null ||
    day.ride !== "foot" ||
    day.line !== null ||
    day.level > 0 ||
    day.dir >= 0 ||
    beamIndexAt(day) < 0
  ) {
    day.beamed = 0;
    return;
  }
  day.beamed += 1;
  if (day.beamed < beamWait) return;
  day.beamed = 0;
  const alarm = invading(day);
  if (peaceable(day) || day.bag > 0) day.talk = alarm ? "abduction" : "visit";
  else if (alarm) abducted(day);
}

// A beam-up with the saucer the hero is aboard, which then flies home.
function beamedUp(day: Draft, first: string): void {
  const index = beamIndexAt(day);
  day.done = [
    ...day.done,
    ...(day.done.includes(first) ? [] : [first]),
    ...(index < 0 ? [] : [beamupOf(index)]),
  ];
}

// An answer aboard: "peace", "trade" or "quietly".
export function aboard(day: Draft, name: string): string | null {
  if (name === "peace") {
    if (!peaceable(day)) return "you need glow sticks and a pizza";
    day.rep += settled(day) ? 25 : 100;
    day.vision = Math.max(day.vision, 2 * visionTicks);
    beamedUp(day, "contact");
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
    beamedUp(day, "traded");
    return null;
  }
  abducted(day);
  return null;
}
