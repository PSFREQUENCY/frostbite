import {
  candleTicks,
  heatPerStar,
  moonFare,
  moonPad,
  shuttleBooth,
  visionTicks,
} from "./constants.ts";
import { cooled } from "./heat.ts";
import type { Draft } from "./types.ts";

// What each shop's counter sells: its price and what it does. Coffee and noodles calm FOMO, food and a glow stick give frost vision back,
// a new cut or a new fit loses heat, the pawn shop buys loot, the arcade has four cabinets (`games`), and the gym and the bait shop are
// good for standing.
export const counters: Readonly<Record<string, number>> = {
  arcade: 10,
  bait: 10,
  barber: 60,
  bodega: 5,
  coffee: 5,
  gym: 20,
  hardware: 30,
  laundry: 20,
  noodles: 15,
  pawn: 0,
  pizza: 10,
};
// The arcade's cabinets, each played once a day for the arcade's price: what a win pays (DUN, or standing for the dance machine), and
// on which candles it wins (every second, every third, or the odd ones).
export const games: Readonly<
  Record<string, readonly [pays: number, every: number, offset: number]>
> = {
  claw: [30, 2, 0],
  hoops: [40, 3, 0],
  pusher: [20, 2, 1],
  dance: [3, 1, 0],
};

export function counter(day: Draft, kind: string): string | null {
  const cost = counters[kind] ?? 0;
  if (kind === "pawn") {
    if (day.hot === 0) return "nothing to pawn";
    const gain = Math.floor((day.hot * 2) / 5);
    day.pocket += gain;
    day.made += gain;
    day.fenced += gain;
    day.hot = 0;
    return null;
  }
  if (day.pocket < cost) return "not enough DUN";
  day.pocket -= cost;
  const most = 2 * visionTicks;
  if (kind === "coffee") day.fomo = Math.max(0, day.fomo - 25);
  if (kind === "noodles") {
    day.fomo = Math.max(0, day.fomo - 10);
    day.rep += 2;
  }
  if (kind === "pizza") day.vision = Math.min(most, day.vision + 150);
  if (kind === "bodega") day.vision = Math.min(most, day.vision + 90);
  if (kind === "hardware") day.vision = Math.min(most, day.vision + 150);
  if (kind === "barber") cooled(day, 100);
  if (kind === "laundry") cooled(day, 50);
  if (kind === "gym" || kind === "bait") day.rep += kind === "gym" ? 5 : 2;
  return null;
}

export function play(day: Draft, game: string): string | null {
  const [pays, every, offset] = games[game] ?? [0, 1, 0];
  if (day.done.includes(`game-${game}`))
    return "you have played that one today";
  const cost = counters.arcade ?? 0;
  if (day.pocket < cost) return "not enough DUN";
  day.pocket -= cost;
  day.done = [...day.done, `game-${game}`];
  if (Math.floor(day.tick / candleTicks) % every !== offset) return null;
  if (game === "dance") day.rep += pays;
  else {
    day.pocket += pays;
    day.made += pays;
  }
  return null;
}

// The trip to the moon: a seat costs `moonFare`, paid from the pocket and then the freezer, on foot and with no heat on you (the shuttle
// boards nobody the city is after). The helmet comes with the seat. On the moon the colony says hello once, a crater rim gives up one rock,
// and the pad flies you home to the booth.
export function lunar(day: Draft, name: string): string | null {
  if (name === "land") {
    day.x = shuttleBooth.x;
    day.z = shuttleBooth.z;
    return null;
  }
  if (name === "rock" || name === "colony") {
    const id = name === "rock" ? "moon-rock" : "colony";
    if (day.done.includes(id)) return "you have been here today";
    day.done = [...day.done, id];
    day.rep += name === "rock" ? 50 : 25;
    return null;
  }
  if (day.ride !== "foot") return "leave the ride you are on first";
  if (day.heat >= heatPerStar)
    return "the shuttle boards nobody with heat on them";
  if (day.pocket + day.freezer < moonFare) return "a seat costs 500,000 DUN";
  const fromPocket = Math.min(day.pocket, moonFare);
  day.pocket -= fromPocket;
  day.freezer -= moonFare - fromPocket;
  day.x = moonPad.x;
  day.z = moonPad.z - 600;
  if (!day.done.includes("moon")) day.done = [...day.done, "moon"];
  return null;
}
