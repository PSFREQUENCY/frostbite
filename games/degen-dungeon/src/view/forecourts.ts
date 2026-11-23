import { Group, MeshToonMaterial } from "three";

import { rooms } from "../rules/rooms.ts";
import type { DayState } from "../rules/types.ts";
import { hash } from "./hash.ts";
import { buildKit, kits } from "./kits.ts";
import { pumpOffset, pumpPeriod, pumps } from "./shop-plans.ts";
import { frameOf, front } from "./shops.ts";
import { toonSteps } from "./textures.ts";

// The Silky forecourts in use: at each pump a car pulls in off the street, stands while its driver fills it up (`shop-plans.ts` puts the
// driver by the hose), and pulls out again, each pump on its own beat, so a station always has someone filling up or about to. Drawn only
// near the hero. Nothing here touches the rules.
export interface Forecourts {
  readonly root: Group;
  show(state: DayState | null, seconds: number): void;
}

const paints = [
  "#e63946",
  "#2f6fb5",
  "#f4f8ff",
  "#3fae6b",
  "#ffd166",
  "#2a2f45",
];
const ease = (part: number): number => part * part * (3 - 2 * part);

// Where a car is along its pump's lane (metres across the forecourt from the pump), or null while the pump stands empty.
export function carAt(seconds: number, offset: number): number | null {
  const now = (((seconds - offset) % pumpPeriod) + pumpPeriod) % pumpPeriod;
  if (now < 4) return -14 * (1 - ease(now / 4));
  if (now < 28) return 0;
  if (now < 32) return 16 * ease((now - 28) / 4);
  return null;
}

export function buildForecourts(): Forecourts {
  const root = new Group();
  root.name = "forecourts";
  const cars = rooms
    .filter(({ kind }) => kind === "gas")
    .flatMap((room, station) =>
      pumps.map((u, pump) => {
        const colour =
          paints[Math.floor(hash(station, pump, 3) * paints.length)] ??
          "#e63946";
        const car = buildKit(
          kits.car,
          new MeshToonMaterial({ color: colour, gradientMap: toonSteps }),
        );
        car.name = `pump-car-${String(station)}-${String(pump)}`;
        root.add(car);
        return { car, offset: pumpOffset(station, pump), room, u };
      }),
    );
  return {
    root,
    show(state, seconds) {
      for (const { car, offset, room, u } of cars) {
        const { toX, toZ } = frameOf(room);
        const along = carAt(seconds, offset);
        const near =
          state !== null &&
          Math.abs(toX(u) - state.x / 100) < 120 &&
          Math.abs(toZ(front) - state.z / 100) < 120;
        car.visible = near && along !== null;
        if (!car.visible) continue;
        car.position.set(toX(u + (along ?? 0)), 0, toZ(front + 6.2));
        car.rotation.y = Math.PI / 2;
      }
    },
  };
}
