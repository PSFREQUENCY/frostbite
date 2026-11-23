import { borrowHeat } from "./constants.ts";
import { heated, rankOf } from "./heat.ts";
import { flies, type Draft, type Ride } from "./types.ts";
import { dockLand, dockWater } from "./world.ts";

// Getting on and off: a ride hired at its stand (borrowed above the hero's rank, which brings heat), and stepping off whatever is under
// the hero. The Green Line is a ride of its own (`business.ts`).
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

// Stepping off a ride: one taken from the kerb stays where it is left (the last six are remembered) and can be taken again.
export function stepOff(day: Draft): null {
  if (
    day.rideId !== "" &&
    day.ride !== "foot" &&
    day.ride !== "boat" &&
    day.ride !== "board" &&
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
