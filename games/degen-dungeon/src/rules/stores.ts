import { fizzTicks, visionTicks } from "./constants.ts";
import { takeRay } from "./freeze.ts";
import { buy, sell } from "./market.ts";
import type { Draft } from "./types.ts";

// The corner stores and the Gwei Gas stations (`rooms.ts`), and the ID kiosk (`sites.ts`). A corner store's counter, behind bulletproof
// glass, sells hot chips (frost vision), a chopped cheese (the block respects a regular) and a juice (calmer), and its freezer ice pops
// and pints (cooler still); Cold Harbor Deli's freezer also holds the freeze ray (`freeze.ts`). A gas station's counter sells snacks, a
// Fuzzy (an extra-fizzy soda, sold only on sight of an ID: quicker on foot for half a minute) and a full tank (anything with an engine a
// little quicker for the rest of the day); its coin ATM buys and sells the coin of the day for a fee, ID first. The kiosk makes a Nakasato
// ID, which the save keeps from day to day.
export const storePrices: Readonly<Record<string, number>> = {
  chips: 5,
  chopped: 8,
  fuzzy: 25,
  icepop: 3,
  id: 100,
  juice: 4,
  pint: 9,
  snacks: 6,
  tank: 40,
};
export const atmFee = 10;

type Answer = { readonly does?: string; readonly to?: string };
const again = (item: string, node: string): Answer => ({
  does: `store-${item}`,
  to: node,
});
// The talks, for `talk.ts`; the last answer of each walks away.
export const storeNodes: Readonly<Record<string, readonly Answer[]>> = {
  atm: [again("buy", "atm"), again("sell", "atm"), {}],
  freezer: [again("icepop", "freezer"), again("pint", "freezer"), {}],
  "freezer-ray": [{ does: "store-ray" }, again("icepop", "freezer-ray"), {}],
  id: [{ does: "store-id" }, {}],
  "shop-bodega": [
    again("chips", "shop-bodega"),
    again("chopped", "shop-bodega"),
    again("juice", "shop-bodega"),
    {},
  ],
  "shop-gas": [
    again("snacks", "shop-gas"),
    again("fuzzy", "shop-gas"),
    again("tank", "shop-gas"),
    {},
  ],
};

const noId = "ID first: the kiosk by The Shaft's Gwei Gas makes one";

// The coin ATM: the Exchange floor's own trade, ID first, for a flat fee in and a tenth of what comes out.
function atm(day: Draft, buying: boolean, locked: boolean): string | null {
  if (!day.idCard) return noId;
  if (locked) return "your wallet is locked";
  if (buying) {
    if (day.pocket <= atmFee) return "not enough DUN";
    day.pocket -= atmFee;
    return buy(day, false);
  }
  const before = day.pocket;
  const reason = sell(day);
  if (reason !== null) return reason;
  day.pocket -= Math.floor((day.pocket - before) / 10);
  return null;
}

export function storeDeed(
  day: Draft,
  name: string,
  locked: boolean,
): string | null {
  const item = name.slice(6);
  if (item === "ray") return takeRay(day);
  if (item === "buy" || item === "sell")
    return atm(day, item === "buy", locked);
  if (item === "id" && day.idCard) return "you have your ID already";
  if (item === "fuzzy" && !day.idCard) return noId;
  if (item === "tank" && day.done.includes("tank"))
    return "the tank is already full";
  const price = storePrices[item] ?? 0;
  if (day.pocket < price) return "not enough DUN";
  day.pocket -= price;
  const most = 2 * visionTicks;
  if (item === "chips") day.vision = Math.min(most, day.vision + 90);
  if (item === "snacks") {
    day.vision = Math.min(most, day.vision + 60);
    day.fomo = Math.max(0, day.fomo - 5);
  }
  if (item === "chopped") day.rep += 3;
  if (item === "juice") day.fomo = Math.max(0, day.fomo - 8);
  if (item === "icepop") day.fomo = Math.max(0, day.fomo - 12);
  if (item === "pint") {
    day.fomo = Math.max(0, day.fomo - 20);
    day.rep += 1;
  }
  if (item === "fuzzy") day.fizz = fizzTicks;
  if (item === "tank") day.done = [...day.done, "tank"];
  if (item === "id") {
    day.idCard = true;
    day.done = [...day.done, "id-card"];
  }
  return null;
}
