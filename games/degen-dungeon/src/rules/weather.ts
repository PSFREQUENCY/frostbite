import { roll } from "./coin.ts";
import type { DayState, Draft, Weather } from "./types.ts";

// The weather: three times a day the sky may turn (early, midday and late), and a harsh spell lasts three minutes before it clears. Which
// spell comes is the seed's; standing in the city calms the sky (a player of good standing sees harsh weather a third of the time rather
// than half). Fog, snow and blizzards hide the hero, so heat fades twice as fast; a heatwave makes it fade at half the pace;
// thunderstorms and gales make the market jumpy, so FOMO climbs twice as fast.
export const spellStarts: readonly number[] = [1_500, 7_500, 13_500];
export const spellTicks = 5_400;
export const calmRep = 200;
export const harsh: readonly Weather[] = [
  "blizzard",
  "fog",
  "gale",
  "heat",
  "snow",
  "storm",
];

// The spell a window of a day brings, for a seed and a standing: "clear" or one of the harsh kinds.
export function spellOf(
  seed: number,
  day: number,
  window: number,
  rep: number,
): Weather {
  const salt = 0x5e_a7_00 + day * 16 + window;
  if (roll(seed, salt, rep >= calmRep ? 3 : 2) !== 0) return "clear";
  return harsh[roll(seed, salt ^ 0x77_00, harsh.length)] ?? "clear";
}

// Each tick: a window opening turns the sky, and a spell's end clears it.
export function skies(day: Draft): void {
  const window = spellStarts.indexOf(day.tick);
  if (window >= 0) day.weather = spellOf(day.seed, day.day, window, day.rep);
  else if (spellStarts.some((start) => day.tick === start + spellTicks))
    day.weather = "clear";
}

// How many ticks a star of heat takes to fade in this weather, from its usual pace.
export const fadeIn = (
  state: Pick<DayState, "weather">,
  fade: number,
): number =>
  state.weather === "fog" ||
  state.weather === "blizzard" ||
  state.weather === "snow"
    ? Math.max(1, Math.floor(fade / 2))
    : state.weather === "heat"
      ? fade * 2
      : fade;
