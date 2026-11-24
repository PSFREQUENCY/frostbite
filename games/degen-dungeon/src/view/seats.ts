import type { Ride } from "../rules/types.ts";
import type { Seat } from "./body.ts";

// Where people ride on each ride, in the ride's own frame (metres: x across, with the driver's door on +x; y the height of the hips, or
// of the feet on a deck; z forward), and how they sit. A ride with fewer seats than people leaves the rest running alongside; a boat,
// a helicopter and a saucer carry everyone standing on board.
export interface Place {
  readonly seat: Seat;
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

const sit = (x: number, y: number, z: number, seat: Seat = "seat"): Place => ({
  seat,
  x,
  y,
  z,
});
const pair = (y: number, z: number, x = 0.42): Place[] => [
  sit(x, y, z),
  sit(-x, y, z),
];

export const seatsOf: Readonly<
  Record<Exclude<Ride, "foot">, readonly Place[]>
> = {
  bike: [sit(0, 0.95, -0.2, "pedal")],
  board: [sit(0, 0.16, 0, "board")],
  boat: [],
  car: [...pair(0.56, 0.15), ...pair(0.56, -0.8)],
  heli: [],
  hover: pair(0.6, 0.05),
  saucer: [],
  moto: [sit(0, 1.05, -0.22, "saddle"), sit(0, 1.08, -0.62, "saddle")],
  scooter: [sit(0, 0.33, -0.08, "deck")],
  semi: pair(1.9, 1, 0.55),
  truck: pair(0.9, 1, 0.45),
  van: [
    ...pair(0.78, 1, 0.45),
    ...pair(0.78, 0, 0.45),
    ...pair(0.78, -1, 0.45),
  ],
};

// The rides with a driver's door that swings open and shut as the hero gets in or out.
export const doored = (ride: Ride): boolean =>
  ride === "car" || ride === "semi" || ride === "truck" || ride === "van";

// How far open a door is a time (seconds) after getting in or out: it opens fast, stays open while they climb through, then shuts.
export const doorLength = 1.1;
export const swing = (since: number): number =>
  since < 0 || since > doorLength
    ? 0
    : since < 0.25
      ? since / 0.25
      : since < 0.6
        ? 1
        : 1 - (since - 0.6) / 0.5;
