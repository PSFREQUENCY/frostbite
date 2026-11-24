import { nightTick, ticksPerSecond, waterline } from "./rules/constants.ts";
import { dashCar } from "./rules/course.ts";
import { stageOf } from "./rules/dash.ts";
import { beams, invading, peaceable } from "./rules/invasion.ts";
import { tillOf } from "./rules/business.ts";
import { eraOf, invasionEra } from "./rules/calendar.ts";
import { evicted, lateFee, rentDue, rentOf } from "./rules/lofts.ts";
import { echoAt } from "./rules/machine.ts";
import { openTo, spotNamed, spots, type Spot } from "./rules/places.ts";
import { beatOf, questOf, tunnelMouth, type Quest } from "./rules/story.ts";
import { motors, type DayState, type Point } from "./rules/types.ts";

// Where the next thing to do is, for the glow on the map and the beacon in the city: home while the balance drains (the terminal is
// there), the beach once the oldest tunnel is open, the next gate on a Degen Dash (the Dash car before the drive), the newbie on a trip
// back, or where today's quest is done; and home to sleep once the day's three quests are done. It reads the day and decides nothing.
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

// The nearest open place of a kind the quest needs, or home when there is none.
function nearestWhere(
  day: DayState,
  fits: (spot: Spot) => boolean,
): Point | null {
  let best: Point | null = null;
  let gap = Infinity;
  for (const spot of spots) {
    const away = Math.abs(spot.x - day.x) + Math.abs(spot.z - day.z);
    if (fits(spot) && openTo(spot, day) && away < gap) {
      best = spot;
      gap = away;
    }
  }
  return best;
}

// Where today's quest is done, by the quest.
function questPlace(day: DayState, quest: Quest): Point | null {
  switch (quest) {
    case "speech":
      return spotNamed("frost") ?? null;
    case "wallet":
      return (
        spotNamed(day.done.includes("wallet-found") ? "pearl" : "wallet") ??
        null
      );
    case "paper":
      return spotNamed("faucet") ?? null;
    case "gig":
      return day.parcel === null
        ? nearestWhere(day, (spot) => spot.kind === "gig")
        : (spotNamed(day.parcel) ?? null);
    case "ride":
      return nearestWhere(day, (spot) => spot.kind === "stop");
    case "trade":
      return spotNamed("chart") ?? null;
    case "dash":
      return spotNamed("dash") ?? null;
    case "crew":
      return nearestWhere(
        day,
        (spot) =>
          spot.kind === "recruit" &&
          spot.hero !== day.hero &&
          !day.done.includes(spot.id),
      );
    case "beach":
      return { x: tunnelMouth.x, z: waterline };
    default:
      return beatOf(day)?.at ?? null;
  }
}

export function questAt(day: DayState): Point | null {
  if (day.ended) return null;
  // The purse snatcher, while he runs.
  if (day.thief !== null) return day.thief;
  // Home is the bed, or the landlord first while the hero is locked out or owes the rent (the shop's till first, if the pocket is short
  // and the shop has sold something).
  const landlord = spotNamed(`landlord-${String(day.hero)}`) ?? null;
  const bed = spotNamed(`home-${String(day.hero)}`) ?? null;
  const owed = rentOf(day) + (evicted(day) ? lateFee : 0);
  const short = day.pocket < owed && tillOf(day) > 0;
  const till = spotNamed(`till-${String(day.hero)}`) ?? null;
  const home = evicted(day) || rentDue(day) ? (short ? till : landlord) : bed;
  if (day.drain > 0 || day.fake) return evicted(day) ? landlord : bed;
  if (invading(day)) return saucerGoal(day) ?? home;
  if (day.gate > 0) return { x: tunnelMouth.x, z: waterline };
  // In the last two minutes before nightfall, unpaid rent comes before the story.
  if (rentDue(day) && day.tick >= nightTick - 120 * ticksPerSecond) return home;
  const stage = stageOf(day);
  if (stage !== null)
    return stage.trial === "car" && !motors.some((ride) => ride === day.ride)
      ? dashCar
      : stage;
  if (day.loop > 0) {
    const echo = echoAt(day);
    return echo !== null && !day.done.includes(echo.id) ? echo : home;
  }
  const quest = questOf(day);
  return quest === null ? home : (questPlace(day, quest) ?? home);
}

// The clues frost vision lights up, in the city and on the map: the gifts for the saucers' visitors (glow sticks at the hardware store
// and a pizza, from the mania on, until bought that day), and the magnet and the vacuum for the Great Airdrop until they are picked up.
export interface Clue extends Point {
  readonly kind: "glow" | "magnet" | "pizza" | "vacuum";
}
const counterOf = (node: string): Spot | undefined =>
  spots.find((spot) => spot.kind === "talk" && spot.node === node);
export function cluesOf(day: DayState): readonly Clue[] {
  const gifts = day.loop === 0 && eraOf(day.day) >= invasionEra;
  const found: Clue[] = [];
  const add = (kind: Clue["kind"], spot: Spot | undefined, want: boolean) => {
    if (spot !== undefined && want && openTo(spot, day))
      found.push({ kind, x: spot.x, z: spot.z });
  };
  add(
    "glow",
    counterOf("shop-hardware"),
    gifts && !day.done.includes("item-glow"),
  );
  add(
    "pizza",
    counterOf("shop-pizza"),
    gifts && !day.done.includes("item-pizza"),
  );
  add("magnet", spotNamed("tool-magnet"), (day.tools & 1) === 0);
  add("vacuum", spotNamed("tool-vacuum"), (day.tools & 2) === 0);
  return found;
}
