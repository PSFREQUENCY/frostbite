import { lineLift, lineTicks } from "../rules/business.ts";
import { flying, powerLevel } from "../rules/flight.ts";
import { beamWait } from "../rules/invasion.ts";
import type { DayState } from "../rules/types.ts";
import { roofAt } from "./lots.ts";

// How high above the ground something carries the hero, in metres: the Green Line's lift up to the platform and the train along the
// rails (`view/train.ts`), a saucer's beam, which takes a hero standing in it up toward the saucer and holds them under it while they
// are aboard, and the dragon's own wings, low at the power's first level and higher at each one after (`rules/flight.ts`). Null with
// nothing carrying them. On a skateboard rolling along, an ollie every two and a half seconds.
export const flightHeights = [3, 10, 20] as const;
export const deckHeight = 22.6;
export const beamTop = 17;
const smooth = (part: number): number => part * part * (3 - 2 * part);

export function liftOf(
  state: Partial<
    Pick<
      DayState,
      | "beamed"
      | "done"
      | "flyHigh"
      | "flyUntil"
      | "line"
      | "talk"
      | "tick"
      | "x"
      | "z"
    >
  >,
): number | null {
  if (flying({ flyUntil: state.flyUntil ?? 0, tick: state.tick ?? 0 })) {
    // Flying high, the dragon rises over the roofs it crosses.
    const level =
      flightHeights[powerLevel({ done: state.done ?? [] }) - 1] ?? 3;
    if (state.flyHigh !== true) return level;
    const roof = roofAt((state.x ?? 0) / 100, (state.z ?? 0) / 100) ?? 0;
    return Math.max(level, flightHeights[1], roof + 2.5);
  }
  const line = state.line ?? null;
  if (line !== null) {
    const ridden = (state.tick ?? line.at) - line.at;
    const up = Math.min(1, ridden / lineLift, (lineTicks - ridden) / lineLift);
    return deckHeight * smooth(Math.max(0, up));
  }
  if (state.talk === "abduction" || state.talk === "visit") return beamTop;
  const beamed = state.beamed ?? 0;
  if (beamed > 0) return beamTop * smooth(Math.min(1, beamed / beamWait));
  return null;
}

export const ollieOf = (
  state: Pick<DayState, "ride"> &
    Partial<Pick<DayState, "dir" | "talk" | "tick">>,
): number => {
  if (state.ride !== "board" || (state.dir ?? -1) < 0 || state.talk != null)
    return 0;
  const phase = ((state.tick ?? 0) % 75) / 15;
  return phase < 1 ? 0.4 * Math.sin(phase * Math.PI) : 0;
};
