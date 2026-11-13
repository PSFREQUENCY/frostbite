import {
  borrowHeat,
  drainPace,
  faucetDun,
  gaitStealth,
  nightTick,
  gigRep,
  lineCool,
  lootHeat,
  lootRep,
  rebrandCool,
  witnessHeat,
} from "./constants.ts";
import { cooled, heated, rankOf } from "./heat.ts";
import { heroes } from "./heroes.ts";
import { actMachine, pickMachine } from "./machine.ts";
import { actMystery } from "./mystery.ts";
import { nearest, spotNamed, spots, type Spot } from "./places.ts";
import { actStory, pickStory } from "./story.ts";
import { locked, pickNode, stash } from "./talk.ts";
import type { Draft, Ride } from "./types.ts";
import { dockLand, dockWater, onStreet } from "./world.ts";

// The act button, the answer to a question and a helicopter's climb. Each answers null when it is done, or why it cannot be. The statue,
// the newbie of a trip back, the watcher and the story's beat are asked first; then the nearest open place. A new kind of place is a new
// case in `useSpot`.
const usedUp = "that is used up for today";
function once(day: Draft, id: string, effect: () => void): string | null {
  if (day.done.includes(id)) return usedUp;
  day.done = [...day.done, id];
  effect();
  return null;
}

// Gigs pay for charm, and the era decides the rate: a little more in the mania, half in the winter, less once robots take the routes.
const eraPay = [100, 120, 50, 60, 100] as const;
function deliver(day: Draft, id: string): string | null {
  const gig = spots.find((spot) => spot.kind === "gig" && spot.to === id);
  if (day.parcel !== id || gig?.kind !== "gig")
    return "nothing to deliver here";
  const charm =
    (heroes[day.hero]?.charm ?? 0) + (day.done.includes("fit-shades") ? 1 : 0);
  const rate = eraPay[day.day - 1] ?? 100;
  const pay = Math.floor((gig.pay * (100 + 5 * charm) * rate) / 10_000);
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

function ask(day: Draft, spot: Spot): string | null {
  if (day.done.includes(spot.id)) return usedUp;
  if (spot.kind === "recruit") {
    if (spot.hero === day.hero) return "that is you";
    if (day.crew.length >= 2) return "the crew is full";
  }
  day.talk = spot.id;
  return null;
}

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

// Loot taken in front of a crowd (the market, or The Exchange on the riot morning and Moon Night) brings witnesses. A hooded parka (bought,
// or found in a dead locker) hides a face.
function loot(day: Draft, spot: Spot & { readonly kind: "loot" }): void {
  const stealth =
    (heroes[day.hero]?.stealth ?? 0) +
    (gaitStealth[day.gait] ?? 0) +
    (day.done.includes("fit-parka") || day.done.includes("locker") ? 2 : 0);
  const crowd =
    spot.id === "loot-stall" ||
    (spot.id === "loot-vault" && (day.day === 1 || day.day === 5));
  day.hot += spot.value;
  day.rep = Math.max(0, day.rep - lootRep);
  heated(day, lootHeat - 12 * stealth + (crowd ? witnessHeat : 0));
}

// Opening a talk: Frost gives the speech on the first morning, the floor and the shops need an unlocked wallet, and MAXX is shut after the
// winter.
function open(day: Draft, node: string): string | null {
  if (node === "lantern" && day.tick < nightTick)
    return "the lanterns go up after dark";
  if (node === "frost")
    day.talk =
      day.day === 1 && !day.done.includes("speech") ? "speech" : "frost";
  else if (node === "maxx" && day.day > 3)
    return "MAXX is back after maintenance";
  else if (locked(day) && node !== "maxx") return "your wallet is locked";
  else day.talk = node;
  return null;
}

function useSpot(day: Draft, spot: Spot): string | null {
  switch (spot.kind) {
    case "drop":
      return deliver(day, spot.id);
    case "faucet":
      return once(day, spot.id, () => {
        day.pocket += faucetDun;
        if (day.day === 1 && day.loop === 0 && day.paper === 0)
          day.talk = "paper";
      });
    case "fence":
      return fence(day);
    case "freezer":
      return stash(day);
    case "gig":
      if (day.parcel !== null) return "deliver the parcel you carry first";
      day.parcel = spot.to;
      return null;
    case "heroword":
    case "letter":
    case "plug":
      return once(day, spot.id, () => {
        if (spot.kind === "letter") day.letters += 1;
        if (spot.kind === "plug") day.rep += 50;
      });
    case "home":
      if (spot.hero !== day.hero) return "this is not your place";
      day.talk = "home";
      return null;
    case "locker":
      if (day.words < 3) return "it needs three street words";
      return once(day, spot.id, () => void (day.pocket += 500));
    case "loot":
      return once(day, spot.id, () => loot(day, spot));
    case "parked":
      // Beside another parked ride, the one being ridden is parked too.
      if (day.ride !== "foot") {
        day.ride = "foot";
        return null;
      }
      return once(day, spot.id, () => {
        day.ride = spot.ride;
        if (spot.ride === "car") heated(day, borrowHeat);
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
    case "talk":
      return open(day, spot.node);
    case "tool":
      return once(day, spot.id, () => void (day.tools |= spot.tool));
    case "word":
      return once(day, spot.id, () => void (day.words += 1));
  }
}

export function act(day: Draft): string | null {
  if (day.talk !== null) return "answer first";
  if (day.ride === "heli") {
    if (day.level > 0) return "land before stepping out";
    day.ride = "foot";
    return null;
  }
  for (const special of [actMachine, actMystery, actStory]) {
    const answer = special(day);
    if (answer !== undefined) return answer;
  }
  const spot = nearest(day);
  if (spot !== null) return useSpot(day, spot);
  if (day.ride === "foot" || day.ride === "boat") return "nothing to do here";
  day.ride = "foot";
  return null;
}

// An offer taken: a scam costs what it asks, and some drain the pocket fast or leak it slowly until the hideout terminal stops it.
function took(day: Draft, spot: Spot & { readonly kind: "offer" }): void {
  if (!(spot.crooked ?? day.crooked)) {
    day.pocket += spot.pay;
    day.made += spot.pay;
    return;
  }
  day.pocket -= Math.min(day.pocket, spot.cost);
  day.rugged += 1;
  if (spot.effect === "drain") day.drain = Math.max(day.drain, drainPace);
  if (spot.effect === "leak") day.drain = Math.max(day.drain, 1);
}

// An answer: 0 is yes and 1 is no to an offer, a recruit or the newbie; a talk or a story beat has its own list of answers.
export function pick(day: Draft, choice: number): string | null {
  for (const special of [pickStory, pickNode]) {
    const answer = special(day, choice);
    if (answer !== undefined) return answer;
  }
  if (choice > 1) return "yes or no";
  const machine = pickMachine(day, choice === 0);
  if (machine !== undefined) return machine;
  const spot = day.talk === null ? undefined : spotNamed(day.talk);
  if (spot === undefined) return "nobody asked";
  day.talk = null;
  day.done = [...day.done, spot.id];
  if (spot.kind === "recruit" && choice === 0)
    day.crew = [...day.crew, spot.hero];
  if (spot.kind !== "offer") return null;
  if (choice === 0) took(day, spot);
  else if (spot.crooked ?? day.crooked) day.spotted += 1;
  return null;
}

export function lift(day: Draft, by: number): string | null {
  if (day.ride !== "heli") return "only a helicopter climbs";
  const level = day.level + by;
  if (level < 0 || level > 3) return "no higher or lower than that";
  if (level === 0 && !onStreet(day.x, day.z)) return "nowhere to land here";
  day.level = level;
  return null;
}

// Frost vision on or off, while any is left today.
export function look(day: Draft): string | null {
  if (!day.looking && day.vision === 0)
    return "frost vision is spent for today";
  day.looking = !day.looking;
  return null;
}

// How the hero moves on foot from now: 0 walking, 1 running, 2 crouching, 3 crawling.
export function gait(day: Draft, mode: number): string | null {
  if (day.gait === mode) return "already moving that way";
  day.gait = mode;
  return null;
}
