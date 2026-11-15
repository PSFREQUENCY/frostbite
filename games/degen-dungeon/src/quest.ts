import { waterline } from "./rules/constants.ts";
import { beams, invading, peaceable } from "./rules/invasion.ts";
import { echoAt } from "./rules/machine.ts";
import { openTo, spotNamed, spots } from "./rules/places.ts";
import { beatOf, dayOneGoal, tunnelMouth } from "./rules/story.ts";
import type { DayState, Point } from "./rules/types.ts";
import { centreOf } from "./rules/world.ts";

// Where the next thing to do is, for the glow on the map and the beacon in the city: home while the balance drains (the terminal is
// there), the beach once the oldest tunnel is open, the newbie on a trip back, the first morning's goal, or the story's beat; and home to
// sleep once the day's story is told. It reads the day and decides nothing.
// While the saucers are over the island: the hardware store for glow sticks, the pizza counter, then the nearest beam (straight to a beam
// with a bag of meme coins to show).
function saucerGoal(day: DayState): Point | null {
  if (peaceable(day) || day.bag > 0)
    return (
      [...beams].sort(
        (a, b) =>
          Math.abs(a.x - day.x) +
          Math.abs(a.z - day.z) -
          Math.abs(b.x - day.x) -
          Math.abs(b.z - day.z),
      )[0] ?? null
    );
  const node = day.done.includes("item-glow") ? "shop-pizza" : "shop-hardware";
  return (
    spots.find((spot) => spot.kind === "talk" && spot.node === node) ?? null
  );
}

export function questAt(day: DayState): Point | null {
  if (day.ended) return null;
  const home = spotNamed(`home-${String(day.hero)}`) ?? null;
  if (day.drain > 0 || day.fake) return home;
  if (invading(day)) return saucerGoal(day) ?? home;
  if (day.gate > 0) return { x: tunnelMouth.x, z: waterline };
  if (day.loop > 0) {
    const echo = echoAt(day);
    return echo !== null && !day.done.includes(echo.id) ? echo : home;
  }
  if (day.day > 1) return beatOf(day)?.at ?? home;
  const goal = dayOneGoal(day);
  if (goal === "riot") return centreOf(4);
  if (goal === "speech") return spotNamed("frost") ?? home;
  if (goal === "paper") return spotNamed("faucet") ?? home;
  if (goal !== "gig") return goal === null ? null : home;
  if (day.parcel !== null) return spotNamed(day.parcel) ?? home;
  let best: Point | null = null;
  let gap = Infinity;
  for (const spot of spots) {
    const away = Math.abs(spot.x - day.x) + Math.abs(spot.z - day.z);
    if (spot.kind === "gig" && openTo(spot, day) && away < gap) {
      best = spot;
      gap = away;
    }
  }
  return best ?? home;
}
