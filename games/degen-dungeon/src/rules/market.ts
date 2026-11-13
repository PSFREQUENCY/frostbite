import { startState, stepInt } from "@frostbite/game-sdk/seeded";

import { buyDun, candleTicks, maxTicks } from "./constants.ts";
import type { Draft } from "./types.ts";

// The coin of the day on the Exchange floor: a price in DUN that moves once a candle (ten seconds), the same for every player of a seed.
// Each era leans it its own way: flat on the riot morning, up in the mania, down in the winter, wild on Launch Day, up on Moon Night.
// Bags are kept in hundredths of a coin, so every number stays whole.
export const candles = Math.ceil(maxTicks / candleTicks);
const opens = [100, 100, 160, 120, 140] as const;
const leans = [0, 2, -4, 0, 3] as const;
const swings = [3, 6, 8, 12, 8] as const;

// The day's prices, one a candle.
export function pricePath(seed: number, day: number): readonly number[] {
  let state = startState(
    Math.imul(seed ^ (day * 0x9e_37_79_b1), 0x85_eb_ca_6b),
  );
  const lean = leans[day - 1] ?? 0;
  const swing = swings[day - 1] ?? 3;
  let price: number = opens[day - 1] ?? 100;
  const path: number[] = [];
  for (let candle = 0; candle < candles; candle += 1) {
    path.push(price);
    const step = stepInt(state, 2 * swing + 1);
    state = step.state;
    price = Math.max(5, price + lean + step.value - swing);
  }
  return path;
}

export const priceAt = (seed: number, day: number, tick: number): number =>
  pricePath(seed, day)[Math.min(candles - 1, Math.floor(tick / candleTicks))] ??
  100;

// The highest price from a tick to the end of the day.
export const topFrom = (seed: number, day: number, tick: number): number =>
  Math.max(...pricePath(seed, day).slice(Math.floor(tick / candleTicks)));

// A buy: a hundred DUN, or the whole pocket all in (which is the only buy left once FOMO is high). A buy within a twentieth of the day's
// top is buying the top.
export function buy(day: Draft, allIn: boolean): string | null {
  const price = priceAt(day.seed, day.day, day.tick);
  const all = allIn || day.fomo >= 70;
  const spend = all ? day.pocket : Math.min(day.pocket, buyDun);
  if (spend <= 0) return "nothing to buy with";
  day.pocket -= spend;
  day.paid += spend;
  day.bag += Math.floor((spend * 100) / price);
  if (day.firstBuy < 0) day.firstBuy = day.tick;
  if (all) day.allIns += 1;
  if (price * 100 >= topFrom(day.seed, day.day, 0) * 95) day.topped += 1;
  return null;
}

// Selling the whole bag. What it gains over what it cost is DUN made; selling before the coin runs half again is paper hands.
export function sell(day: Draft): string | null {
  if (day.bag === 0) return "no bag to sell";
  const price = priceAt(day.seed, day.day, day.tick);
  const value = Math.floor((day.bag * price) / 100);
  if (value > day.paid) day.made += value - day.paid;
  day.pocket += value;
  day.bag = 0;
  day.paid = 0;
  day.sells += 1;
  if (topFrom(day.seed, day.day, day.tick + candleTicks) * 2 >= price * 3)
    day.paperHands += 1;
  return null;
}
