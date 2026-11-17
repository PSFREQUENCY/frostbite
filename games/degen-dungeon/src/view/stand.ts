import { roomAt } from "../rules/rooms.ts";
import type { Spot } from "../rules/spot.ts";
import { metres } from "./city.ts";

// Where the person at a place stands (metres): a shop's clerk behind the counter, toward the back wall; anyone else beside their spot.
export function standAt(spot: Pick<Spot, "x" | "z">): {
  readonly x: number;
  readonly z: number;
} {
  const shop = roomAt(spot.x, spot.z);
  const back = shop === null ? 0 : shop.north ? 1.9 : -1.9;
  return {
    x: metres(spot.x) + (shop === null ? 1.4 : 0),
    z: metres(spot.z) + (shop === null ? -1.4 : back),
  };
}
