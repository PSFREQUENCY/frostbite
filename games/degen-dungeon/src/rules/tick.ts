import {
  drainPace,
  fomoTicks,
  grassTicks,
  heatFadeTicks,
  maxxShare,
  maxxTicks,
  paperTest,
  riotHeat,
  stormStart,
  stormTicks,
  waterline,
} from "./constants.ts";
import { cooled, heated } from "./heat.ts";
import { heroes } from "./heroes.ts";
import type { Draft } from "./types.ts";
import { inPark, inRiot } from "./world.ts";

// Everything a tick does besides moving and chasing: the riot on the first morning, heat fading (fast under the city), FOMO rising in
// the good times and falling in the park, a drained pocket emptying, the seed paper's test, MAXX interest, frost vision running down,
// holding a bag through the storm, and the beach at the end of the tunnel.
function zones(day: Draft): void {
  if (day.day === 1 && day.loop === 0 && !day.done.includes("riot")) {
    if (inRiot(day.x, day.z)) {
      day.done = [...day.done, "riot"];
      if ((heroes[day.hero]?.stealth ?? 0) < 5) heated(day, riotHeat);
    }
  }
  if (day.gate > 0 && day.z <= waterline) {
    day.cause = "beach";
    day.ended = true;
    day.dir = -1;
  }
}

function moods(day: Draft): void {
  const low = day.ride === "foot" && day.gait >= 2;
  const fade =
    day.talk === "lying"
      ? 3
      : day.talk === "hideout"
        ? 10
        : low
          ? heatFadeTicks / 2
          : heatFadeTicks;
  if (day.heat > 0 && day.tick % fade === 0) cooled(day, 1);
  const rising = day.day === 2 || day.day === 5 ? fomoTicks : fomoTicks * 3;
  if (day.tick % rising === 0) day.fomo = Math.min(100, day.fomo + 1);
  const sitting = day.ride === "foot" && day.dir < 0 && inPark(day.x, day.z);
  if (sitting && day.fomo > 0 && day.tick % grassTicks === 0) day.fomo -= 1;
  day.peakFomo = Math.max(day.peakFomo, day.fomo);
  if (sitting && day.fomo === 0 && day.peakFomo >= 50) day.grass = true;
}

// The paper in a pocket (without diamond-hand gloves) or as a photo on the phone is found; under a mattress it is found only if the
// heat brought someone to the door. Either way the balance drains, live, until the hideout terminal stops it.
function tested(day: Draft): boolean {
  if (day.paper === 1) return !day.done.includes("fit-gloves");
  if (day.paper === 2)
    return day.heat >= 200 && !day.done.includes("home-studio");
  return day.paper === 3;
}

function money(day: Draft): void {
  if (day.drain > 0 && day.tick % 10 === 0)
    day.pocket -= Math.min(day.pocket, day.drain);
  if (day.paperAt >= 0 && day.tick === day.paperAt + paperTest && tested(day))
    day.drain = Math.max(day.drain, drainPace);
  if (day.day === 2 && day.tick % maxxTicks === 0)
    day.maxx += Math.floor(day.maxx / maxxShare);
  day.peakPocket = Math.max(day.peakPocket, day.pocket);
}

export function ticked(day: Draft): void {
  zones(day);
  moods(day);
  money(day);
  if (day.looking) {
    day.vision = Math.max(0, day.vision - 1);
    day.looking = day.vision > 0;
  }
  if (
    day.day === 3 &&
    day.tick === stormStart + stormTicks &&
    day.bag > 0 &&
    day.sells === 0 &&
    day.firstBuy >= 0 &&
    day.firstBuy < stormStart
  )
    day.done = [...day.done, "diamond"];
}
