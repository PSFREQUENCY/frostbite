import { Group } from "three";

import { nightTick } from "../rules/constants.ts";
import type { DayState } from "../rules/types.ts";
import { questAt } from "../quest.ts";
import { buildBeacon } from "./beacon.ts";
import { buildLanterns } from "./lanterns.ts";
import { buildParked } from "./parked.ts";
import { buildShops } from "./shops.ts";
import { buildStreet } from "./street.ts";
import { buildTraffic } from "./traffic.ts";
import { buildVenues } from "./venues.ts";
import { buildWalkers } from "./walkers.ts";

// Everything at street level that makes Nakasato feel lived in: the furniture and the notices, the walk-in shops, the parked rides, the
// people walking and talking, the traffic, the landmarks, the lantern night, and the beacon over where to go next. It also keeps the
// time of day, from the day's clock: the sun crosses the sky until dusk, and after `nightTick` it is night.
export interface Town {
  // The town between days (the opening and the hero ring): daylight, people and traffic, nobody's quest.
  idle(seconds: number): void;
  // Where the hero's own lantern is (metres), while it rises; null otherwise.
  lantern(seconds: number): readonly [number, number, number] | null;
  // The colour of a parked ride, by its id.
  paintOf(id: string): string;
  readonly root: Group;
  show(
    day: DayState,
    x: number,
    z: number,
    heading: number,
    seconds: number,
    dt: number,
  ): void;
  // Writes the player's message on the hero's lantern.
  write(message: string): void;
}

// The time of day from the day's clock: how far the sun has gone (0 morning, 1 dusk) and how dark it is (0 day, 1 night).
export const timeOf = (
  tick: number,
): { readonly along: number; readonly dark: number } => {
  const along = Math.min(1, Math.max(0, tick / nightTick));
  const dusk = Math.min(
    1,
    Math.max(0, (tick - nightTick * 0.8) / (nightTick * 0.2)),
  );
  return { along, dark: dusk * dusk * (3 - 2 * dusk) };
};

// How long the camera follows the hero's lantern up after the wish (seconds).
export const lanternShot = 7;

export function buildTown(): Town {
  const root = new Group();
  root.name = "town";
  const street = buildStreet();
  const shops = buildShops();
  const parked = buildParked();
  const walkers = buildWalkers();
  const traffic = buildTraffic();
  const venues = buildVenues();
  const lanterns = buildLanterns();
  const beacon = buildBeacon();
  root.add(
    street.root,
    shops.root,
    parked.root,
    walkers.root,
    traffic.root,
    venues.root,
    lanterns.root,
    beacon.root,
  );
  let sent: number | null = null;
  let wished = 0;
  return {
    idle(seconds) {
      street.run(seconds, 0);
      shops.show(-999, -999, 0);
      walkers.show(seconds, 1);
      traffic.show(seconds, 0.3, 0, -999, -999);
      venues.show(seconds, 0);
      lanterns.show(0, seconds, null);
      beacon.show(null, 0, 0, seconds);
    },
    lantern: (seconds) =>
      sent !== null && seconds - sent < lanternShot ? lanterns.where() : null,
    paintOf: (id) => parked.paintOf(id),
    root,
    show(day, x, z, heading, seconds, dt) {
      const { along, dark } = timeOf(day.tick);
      if (day.wish > 0 && wished === 0) sent = seconds;
      if (day.wish === 0) sent = null;
      wished = day.wish;
      street.run(seconds, dark);
      shops.show(x, z, dt);
      parked.show(day, x, z, heading, seconds);
      walkers.show(seconds, 1 - dark * 0.6);
      traffic.show(seconds, along, dark, x, z);
      venues.show(seconds, dark, x, z);
      lanterns.show(dark, seconds, sent);
      beacon.show(questAt(day), x, z, seconds);
    },
    write: (message) => lanterns.write(message),
  };
}
