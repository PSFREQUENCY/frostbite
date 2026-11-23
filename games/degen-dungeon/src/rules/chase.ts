import { flying } from "./flight.ts";
import {
  catchRadius,
  copFine,
  copGap,
  copPace,
  copStars,
  frozenFine,
  heatPerStar,
  tuxGap,
  tuxStars,
  vestPace,
} from "./constants.ts";
import { isFrozen } from "./freeze.ts";
import { starsOf } from "./heat.ts";
import { below } from "./talk.ts";
import type { Draft, Point } from "./types.ts";

// Who comes after the hero, by stars. Two: a beat cop on a scooter, who fines and lets go. Three: an agent in a black tuxedo who walks
// straight at the hero through walls, a little faster for every star, and freezes what it touches. Four: the FUD's own helicopter, so not
// even the sky is safe. Nobody follows the hero under the city. On the last night Max's Vests follow through the oldest tunnel.
const toward = (from: number, to: number, pace: number): number =>
  from + Math.max(-pace, Math.min(pace, to - from));
const step = (from: Point, to: Point, pace: number): Point => ({
  x: toward(from.x, to.x, pace),
  z: toward(from.z, to.z, pace),
});
const near = (one: Point, other: Point): boolean =>
  Math.max(Math.abs(one.x - other.x), Math.abs(one.z - other.z)) <= catchRadius;
const beside = (day: Draft, gap: number): Point => ({
  x: day.x + (day.x < gap ? gap : -gap),
  z: day.z,
});

function frozen(day: Draft): void {
  day.cause = "frozen";
  day.ended = true;
  day.dir = -1;
  day.hot = 0;
  day.talk = null;
  day.pocket -= Math.min(day.pocket, frozenFine);
}

export function chased(day: Draft): void {
  const stars = starsOf(day.heat);
  // Down in the hideout, up on the Green Line or flying, nobody can reach the hero.
  const hidden = below(day.talk) || day.line !== null || flying(day);
  // A chaser the freeze ray caught stands where it froze until it thaws.
  if (hidden || stars < copStars || stars >= tuxStars) day.cop = null;
  else if (!(day.cop !== null && isFrozen(day, "cop"))) {
    const cop = step(day.cop ?? beside(day, copGap), day, copPace);
    day.cop = cop;
    if (day.level === 0 && near(cop, day)) {
      day.pocket -= Math.min(day.pocket, copFine);
      day.heat = Math.min(day.heat, heatPerStar);
      day.cop = null;
    }
  }
  if (hidden || stars < tuxStars) day.tux = null;
  else if (!(day.tux !== null && isFrozen(day, "tux"))) {
    const tux = step(day.tux ?? beside(day, tuxGap), day, 6 + 2 * stars);
    day.tux = tux;
    if ((day.level === 0 || stars >= 4) && near(tux, day)) frozen(day);
  }
  if (day.vests === null || day.ended) return;
  day.vests = step(day.vests, day, vestPace);
  if (!near(day.vests, day)) return;
  day.cause = "vested";
  day.ended = true;
  day.dir = -1;
}
