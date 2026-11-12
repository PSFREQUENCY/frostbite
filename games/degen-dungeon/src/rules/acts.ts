import {
  borrowHeat,
  faucetDun,
  gigRep,
  lineCool,
  lootHeat,
  lootRep,
  rebrandCool,
} from "./constants.ts";
import { cooled, heated, rankOf } from "./heat.ts";
import { heroes } from "./heroes.ts";
import { actMachine, pickMachine } from "./machine.ts";
import type { Draft, Ride } from "./types.ts";
import {
  dockLand,
  dockWater,
  nearest,
  onLand,
  spotNamed,
  spots,
  type Spot,
} from "./world.ts";

// What the player's choices do: the one act button uses the nearest spot, a pick answers the offer that is waiting, and a lift takes a
// helicopter up or down a level. Each answers null when it is done, or why it cannot be. A new kind of place is a new case in `useSpot`.
// The statue and the newbie of a trip back are not spots: they are asked first, in `machine.ts`.
const usedUp = "that is used up for today";

function once(day: Draft, id: string, effect: () => void): string | null {
  if (day.done.includes(id)) return usedUp;
  day.done = [...day.done, id];
  effect();
  return null;
}

function deliver(day: Draft, id: string): string | null {
  const gig = spots.find((spot) => spot.kind === "gig" && spot.to === id);
  if (day.parcel !== id || gig?.kind !== "gig")
    return "nothing to deliver here";
  const charm = heroes[day.hero]?.charm ?? 0;
  const pay = Math.floor((gig.pay * (100 + 5 * charm)) / 100);
  day.pocket += pay;
  day.made += pay;
  day.gigs += 1;
  day.rep += gigRep;
  day.parcel = null;
  return null;
}

function fence(day: Draft): string | null {
  if (day.hot === 0) return "nothing to sell";
  const gain = Math.floor(day.hot / 2);
  day.pocket += gain;
  day.made += gain;
  day.fenced += gain;
  day.hot = 0;
  return null;
}

function stash(day: Draft): string | null {
  if (day.pocket === 0) return "nothing to stash";
  day.freezer += day.pocket;
  day.pocket = 0;
  return null;
}

function ask(day: Draft, spot: Spot): string | null {
  if (day.done.includes(spot.id)) return usedUp;
  if (spot.kind === "recruit") {
    if (spot.hero === day.hero) return "that is you";
    if (day.crew.length >= 2) return "the crew is full";
  }
  day.talk = spot.id;
  return null;
}

// Taking a ride above your rank is borrowing it, which is stealing. Stepping off a boat puts its rider ashore at the dock.
function board(day: Draft, ride: Ride, rank: number): string | null {
  if (day.ride === ride) {
    day.ride = "foot";
    if (ride === "boat") Object.assign(day, dockLand);
    return null;
  }
  if (day.ride !== "foot") return "leave the ride you are on first";
  if (rankOf(day) < rank) heated(day, borrowHeat);
  day.ride = ride;
  day.level = 0;
  if (ride === "boat") Object.assign(day, dockWater);
  return null;
}

function rideLine(day: Draft, next: string): string | null {
  const to = spotNamed(next);
  if (day.ride !== "foot" || to === undefined)
    return "the train takes people, not rides";
  day.x = to.x;
  day.z = to.z;
  day.rides += 1;
  cooled(day, lineCool);
  return null;
}

function useSpot(day: Draft, spot: Spot): string | null {
  switch (spot.kind) {
    case "drop":
      return deliver(day, spot.id);
    case "faucet":
      return once(day, spot.id, () => void (day.pocket += faucetDun));
    case "fence":
      return fence(day);
    case "freezer":
      return stash(day);
    case "gig":
      if (day.parcel !== null) return "deliver the parcel you carry first";
      return once(day, spot.id, () => void (day.parcel = spot.to));
    case "home":
      if (spot.hero !== day.hero) return "this is not your place";
      day.cause = "home";
      day.ended = true;
      return null;
    case "loot":
      return once(day, spot.id, () => {
        day.hot += spot.value;
        day.rep = Math.max(0, day.rep - lootRep);
        heated(day, lootHeat - 12 * (heroes[day.hero]?.stealth ?? 0));
      });
    case "offer":
    case "recruit":
      return ask(day, spot);
    case "rebrand":
      if (day.heat === 0) return "no heat to lose";
      if (day.pocket < spot.cost) return "not enough DUN";
      day.pocket -= spot.cost;
      cooled(day, rebrandCool);
      return null;
    case "ride":
      return board(day, spot.ride, spot.rank);
    case "stop":
      return rideLine(day, spot.next);
    case "tool":
      return once(day, spot.id, () => void (day.tools |= spot.tool));
    case "word":
      return once(day, spot.id, () => void (day.words += 1));
  }
}

export function act(day: Draft): string | null {
  if (day.talk !== null) return "answer the offer first";
  if (day.ride === "heli") {
    if (day.level > 0) return "land before stepping out";
    day.ride = "foot";
    return null;
  }
  const machine = actMachine(day);
  if (machine !== undefined) return machine;
  const spot = nearest(day.x, day.z);
  if (spot !== null) return useSpot(day, spot);
  if (day.ride === "foot" || day.ride === "boat") return "nothing to do here";
  day.ride = "foot";
  return null;
}

// Yes or no to the offer that is waiting. A crooked offer taken costs the pocket; walked away from, it is a scam spotted.
export function pick(day: Draft, yes: boolean): string | null {
  const machine = pickMachine(day, yes);
  if (machine !== undefined) return machine;
  const spot = day.talk === null ? undefined : spotNamed(day.talk);
  if (spot === undefined) return "nobody asked";
  day.talk = null;
  day.done = [...day.done, spot.id];
  if (spot.kind === "recruit" && yes) day.crew = [...day.crew, spot.hero];
  if (spot.kind !== "offer") return null;
  const scam = spot.crooked ?? day.crooked;
  if (!yes) day.spotted += scam ? 1 : 0;
  else if (scam) {
    day.pocket -= Math.min(day.pocket, spot.cost);
    day.rugged += 1;
  } else {
    day.pocket += spot.pay;
    day.made += spot.pay;
  }
  return null;
}

export function lift(day: Draft, by: number): string | null {
  if (day.ride !== "heli") return "only a helicopter climbs";
  const level = day.level + by;
  if (level < 0 || level > 3) return "no higher or lower than that";
  if (level === 0 && !onLand(day.x, day.z)) return "nowhere to land here";
  day.level = level;
  return null;
}
