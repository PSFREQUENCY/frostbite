import { eraOf } from "./calendar.ts";
import {
  borrowHeat,
  drainPace,
  faucetDun,
  gaitStealth,
  nightTick,
  gigRep,
  lootHeat,
  lootRep,
  rebrandCool,
  witnessHeat,
} from "./constants.ts";
import { board, rideLine, stepOff } from "./boarding.ts";
import { clinging, onTheRoof } from "./climb.ts";
import { askAtDesk, startDash, zuriNear } from "./dash.ts";
import { isFrozen } from "./freeze.ts";
import { landlordNode, lockedOut } from "./lofts.ts";
import { enterWindow } from "./windows.ts";
import { cooled, heated } from "./heat.ts";
import { heroes } from "./heroes.ts";
import { actMachine, pickMachine } from "./machine.ts";
import { actMystery } from "./mystery.ts";
import { inReach, nearest, spotNamed, spots, type Spot } from "./places.ts";
import { wear } from "./statues.ts";
import { actStory, pickStory } from "./story.ts";
import { locked, pickNode, stash } from "./talk.ts";
import { flies, motors, type Draft } from "./types.ts";

// The act button and the answer to a question. Each answers null when it is done, or why it cannot be. The statue,
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
  const rate = eraPay[eraOf(day.day) - 1] ?? 100;
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

// Loot taken in front of a crowd (the market, or The Exchange on the riot morning and Moon Night) brings witnesses. A hooded parka (bought,
// or found in a dead locker) hides a face.
function loot(day: Draft, spot: Spot & { readonly kind: "loot" }): void {
  const stealth =
    (heroes[day.hero]?.stealth ?? 0) +
    (gaitStealth[day.gait] ?? 0) +
    (day.done.includes("fit-parka") || day.done.includes("locker") ? 2 : 0);
  const crowd =
    spot.id === "loot-stall" ||
    (spot.id === "loot-vault" && [1, 5].includes(eraOf(day.day)));
  day.hot += spot.value;
  day.rep = Math.max(0, day.rep - lootRep);
  heated(day, lootHeat - 12 * stealth + (crowd ? witnessHeat : 0));
}

// Opening a talk: Frost gives the speech on the first morning, the floor and the shops need an unlocked wallet, and MAXX is shut after the
// winter.
function open(day: Draft, node: string): string | null {
  // At Miss Mirinda's arch a ride is left first (the Dash starts on foot, and may finish on wheels).
  if (node === "dash")
    return day.ride === "foot" ? startDash(day) : stepOff(day);
  if (node === "quiz") return askAtDesk(day);
  if (node === "lantern" && day.tick < nightTick)
    return "the lanterns go up after dark";
  if (node === "frost")
    day.talk =
      day.day === 1 && !day.done.includes("speech") ? "speech" : "frost";
  else if (node === "landlord") day.talk = landlordNode(day);
  else if (node === "maxx" && eraOf(day.day) > 3)
    return "MAXX is back after maintenance";
  else if (locked(day) && node !== "maxx") return "your wallet is locked";
  else day.talk = node;
  return null;
}

// What the freeze ray caught waits out its thaw: a ride cannot be taken, and nobody frozen can be talked to.
const thawing = "frozen solid: give it half a minute";
function useSpot(day: Draft, spot: Spot): string | null {
  if (isFrozen(day, spot.kind === "parked" ? spot.id : `person-${spot.id}`))
    return thawing;
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
      if (lockedOut(day) !== null) return lockedOut(day);
      day.talk = "home";
      return null;
    case "locker":
      if (day.words < 3) return "it needs three street words";
      return once(day, spot.id, () => void (day.pocket += 500));
    case "loot":
      return once(day, spot.id, () => loot(day, spot));
    case "parked":
      // Beside another parked ride, the one being ridden is parked too.
      if (day.ride !== "foot") return stepOff(day);
      return once(day, spot.id, () => {
        day.ride = spot.ride;
        day.rideId = spot.id;
        if (motors.includes(spot.ride)) heated(day, borrowHeat);
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
    case "statue":
      return wear(day, spot.index);
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
  if (clinging(day)) return enterWindow(day);
  if (onTheRoof(day)) return "climb down first";
  if (flies(day.ride)) {
    if (day.level > 0) return "land before stepping out";
    day.ride = "foot";
    return null;
  }
  for (const special of [actMachine, actMystery, actStory]) {
    const answer = special(day);
    if (answer !== undefined) return answer;
  }
  // A ride left on the street within reach (the last one left first) is taken again, unless a fresh one stands at the kerb here.
  const spot = nearest(day);
  const fresh = spot?.kind === "parked" && !day.done.includes(spot.id);
  const mine =
    day.ride === "foot" && !fresh
      ? [...day.left].reverse().find((ride) => inReach(day, ride))
      : undefined;
  if (mine !== undefined) {
    if (isFrozen(day, mine.id)) return thawing;
    day.left = day.left.filter((ride) => ride !== mine);
    day.ride = mine.ride;
    day.rideId = mine.id;
    return null;
  }
  if (spot !== null) return useSpot(day, spot);
  // Miss Mirinda, waiting beside the hero with a Degen Dash ticket.
  if (zuriNear(day)) {
    day.talk = "zuri";
    return null;
  }
  if (day.ride === "foot" || day.ride === "boat") return "nothing to do here";
  return stepOff(day);
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
