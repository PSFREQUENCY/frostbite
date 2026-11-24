import { roll, saltOf } from "./coin.ts";
import { cooled } from "./heat.ts";
import { roomAt } from "./rooms.ts";
import type { Draft } from "./types.ts";

// The laundromats' washing machines: five down the left wall of each, run from the counter (one place in the shop, as the arcade's
// cabinets are). A wash costs `washCost` and goes in the next free machine, each machine runs once a day, and what its drum turns up is
// the day's luck (its seed): loose change (10 to 40 DUN) four times in ten, a clean outfit somebody left behind (a new look, which loses
// the heat) three in ten, and otherwise lint and an odd sock. What the machine turned up is a short talk.
export const washCost = 5;
export const outfitCool = 60;
export type WashFind = "change" | "clothes" | "lint";

// The machines of the laundromat the hero is in, by their ids, five to a laundromat.
export const machines = 5;
export const washerId = (room: string, index: number): string =>
  `washer-${room}-${String(index)}`;

export function findOf(seed: number, id: string): WashFind {
  const luck = roll(seed, saltOf(id), 10);
  return luck < 4 ? "change" : luck < 7 ? "clothes" : "lint";
}
export const changeOf = (seed: number, id: string): number =>
  10 + roll(seed, saltOf(id) + 1, 31);

// A wash in the next free machine of the laundromat the hero is in.
export function wash(day: Draft): string | null {
  const room = roomAt(day.x, day.z);
  if (room?.kind !== "laundry") return "there are no washers here";
  const id = Array.from({ length: machines }, (_, index) =>
    washerId(room.id, index),
  ).find((one) => !day.done.includes(one));
  if (id === undefined) return "every machine has done its wash today";
  if (day.pocket < washCost) return "not enough DUN";
  day.pocket -= washCost;
  const find = findOf(day.seed, id);
  if (find === "change") {
    const change = changeOf(day.seed, id);
    day.pocket += change;
    day.made += change;
  }
  if (find === "clothes") cooled(day, outfitCool);
  day.done = [...day.done, id];
  day.talk = `wash-${find}`;
  return null;
}
