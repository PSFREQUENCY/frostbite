import { borrowHeat, lineCool } from "./constants.ts";
import { cooled, heated, rankOf } from "./heat.ts";
import { spotNamed } from "./places.ts";
import { flies, type Draft, type Ride } from "./types.ts";
import { dockLand, dockWater } from "./world.ts";

// Getting on and off: a ride hired at its stand (borrowed above the hero's rank, which brings heat), the Green Line to the next stop, and
// stepping off whatever is under the hero.
export function board(day: Draft, ride: Ride, rank: number): string | null {
  if (day.ride === ride) {
    day.ride = "foot";
    day.rideId = "";
    if (ride === "boat") Object.assign(day, dockLand);
    return null;
  }
  if (day.ride !== "foot") return "leave the ride you are on first";
  if (rankOf(day) < rank) heated(day, borrowHeat);
  day.ride = ride;
  day.rideId = "";
  day.level = 0;
  if (ride === "saucer") day.done = [...new Set([...day.done, "saucer"])];
  if (ride === "boat") Object.assign(day, dockWater);
  return null;
}

export function rideLine(day: Draft, next: string): string | null {
  const to = spotNamed(next);
  if (day.ride !== "foot" || to === undefined)
    return "the train takes people, not rides";
  day.x = to.x;
  day.z = to.z;
  day.rides += 1;
  cooled(day, lineCool);
  return null;
}

// Stepping off a ride: one taken from the kerb stays where it is left (the last six are remembered) and can be taken again.
export function stepOff(day: Draft): null {
  if (
    day.rideId !== "" &&
    day.ride !== "foot" &&
    day.ride !== "boat" &&
    !flies(day.ride)
  )
    day.left = [
      ...day.left,
      { id: day.rideId, ride: day.ride, x: day.x, z: day.z },
    ].slice(-6);
  day.ride = "foot";
  day.rideId = "";
  return null;
}
