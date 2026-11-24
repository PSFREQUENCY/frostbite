import type { DayState, Ride } from "../rules/types.ts";
import type { Subject } from "./camera.ts";
import type { Rides } from "./rides.ts";
import { doored, doorLength, swing } from "./seats.ts";
import type { Town } from "./town.ts";

// The ride under the hero, and its door: getting into a car, minivan, pickup or cab swings the driver's door open and shut, and getting
// out does too, on the ride now standing where it was left (the town leaves out its own copy until the door has shut).
export interface Riding {
  // Before the town is drawn: notes a change of ride, and names the ride left on the street the town should not draw ("" for none).
  track(state: DayState, seconds: number): string;
  show(state: DayState, at: Subject, turn: number, seconds: number): void;
}

export function createRiding(rides: Rides, town: Town): Riding {
  let was: Ride = "foot";
  let wasId = "";
  let since = -99;
  let out: { readonly id: string; readonly ride: Ride } | null = null;
  const shutting = (seconds: number): boolean =>
    out !== null && seconds - since < doorLength;
  return {
    show(state, at, turn, seconds) {
      const door = swing(seconds - since);
      if (state.ride !== "foot") {
        rides.show(
          state.ride,
          at.x,
          at.y,
          at.z,
          turn,
          seconds,
          state.rideId === "" ? undefined : town.paintOf(state.rideId),
          state.ride === "car" && state.rideId !== "",
          doored(state.ride) ? door : 0,
        );
        return;
      }
      const left =
        out === null || !shutting(seconds) ? undefined : town.leftAt(out.id);
      if (out === null || left === undefined)
        rides.show("foot", 0, 0, 0, 0, seconds);
      else
        rides.show(
          out.ride,
          left.x,
          0,
          left.z,
          left.turn,
          seconds,
          town.paintOf(out.id),
          out.ride === "car",
          door,
        );
    },
    track(state, seconds) {
      if (state.ride !== was) {
        since = seconds;
        out =
          state.ride === "foot" && doored(was) && wasId !== ""
            ? { id: wasId, ride: was }
            : null;
        was = state.ride;
        wasId = state.rideId;
      }
      return out !== null && shutting(seconds) ? out.id : "";
    },
  };
}
