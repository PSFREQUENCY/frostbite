import type { Wheels } from "./types.ts";
import { reach } from "./constants.ts";
import { streetRooms } from "./rooms.ts";
import type { Spot } from "./spot.ts";
import type { Point } from "./types.ts";
import { at, slotOf } from "./world.ts";

// Rides left along the kerbs of every borough's streets, in a steady mix: cars, scooters, minivans, bikes, motorbikes, pickup trucks and
// the odd semi truck's cab. A
// spot is kept only if it is clear of every other place and story beat, so none crowds another.
const along = [1_600, 3_300, 5_200] as const;

const mix: readonly Wheels[] = [
  "car",
  "scooter",
  "van",
  "bike",
  "car",
  "moto",
  "truck",
  "car",
  "car",
  "scooter",
  "van",
  "bike",
  "car",
  "moto",
  "semi",
  "bike",
];
const labels: Readonly<Record<Wheels, string>> = {
  bike: "A bike",
  car: "A parked car",
  moto: "A motorbike",
  scooter: "A scooter",
  semi: "A semi truck's cab",
  truck: "A pickup truck",
  van: "A minivan",
};

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
  const doors = streetRooms.map(({ door }) => ({
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
            const ride = mix[count % mix.length] ?? "car";
            kept.push({
              ...point,
              id: `${ride}-${String(count)}`,
              kind: "parked",
              label: labels[ride],
              ride,
            });
            count += 1;
          }
        }
  return kept;
}
