import { reach } from "./constants.ts";
import { rooms } from "./rooms.ts";
import type { Spot } from "./spot.ts";
import type { Point } from "./types.ts";
import { at, slotOf } from "./world.ts";

// Cars, scooters and bikes left along the kerbs of every borough's streets: half of them cars, a quarter scooters, a quarter bikes. A
// spot is kept only if it is clear of every other place and story beat, so none crowds another.
const along = [1_600, 3_300, 5_200] as const;

export function parkedRides(taken: readonly Point[]): readonly Spot[] {
  const kept: Spot[] = [];
  const clear = (point: Point): boolean =>
    [...taken, ...kept].every(
      (other) =>
        Math.max(Math.abs(other.x - point.x), Math.abs(other.z - point.z)) >
        2 * reach + 50,
    );
  const beats = Array.from({ length: 9 }, (_, borough) =>
    [0, 1, 2, 3].map((lane) => slotOf(borough, lane)),
  ).flat();
  const doors = rooms.map(({ door }) => ({
    x: (door.x0 + door.x1) / 2,
    z: (door.z0 + door.z1) / 2,
  }));
  let count = 0;
  for (let borough = 0; borough < 9; borough += 1)
    for (const side of [-1, 1])
      for (const step of along)
        for (const sign of [-1, 1]) {
          const spots = [
            at(borough, side * 850, sign * step),
            at(borough, sign * step, side * 850),
          ];
          for (const point of spots) {
            if (
              !clear(point) ||
              ![...beats, ...doors].every(
                (other) =>
                  Math.max(
                    Math.abs(other.x - point.x),
                    Math.abs(other.z - point.z),
                  ) >
                  2 * reach + 50,
              )
            )
              continue;
            const ride =
              count % 4 === 1 ? "scooter" : count % 4 === 3 ? "bike" : "car";
            kept.push({
              ...point,
              id: `${ride}-${String(count)}`,
              kind: "parked",
              label:
                ride === "car"
                  ? "A parked car"
                  : ride === "bike"
                    ? "A bike"
                    : "A scooter",
              ride,
            });
            count += 1;
          }
        }
  return kept;
}
