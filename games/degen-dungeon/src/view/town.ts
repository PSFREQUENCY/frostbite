import { Group } from "three";

import { nightTick } from "../rules/constants.ts";
import type { DayState } from "../rules/types.ts";
import { questAt } from "../quest.ts";
import { buildBeacon } from "./beacon.ts";
import { moverOf } from "./bumps.ts";
import { buildFronts } from "./fronts.ts";
import { buildLanterns } from "./lanterns.ts";
import { buildConcert } from "./concert.ts";
import { buildFood } from "./food.ts";
import { buildPowers } from "./powers.ts";
import { underground } from "../rules/caves.ts";
import { venues } from "../rules/venues.ts";
import { buildCaves } from "./caves.ts";
import { buildBazaar } from "./bazaar.ts";
import { buildBeatScenes } from "./beat-scenes.ts";
import { buildClues } from "./clues.ts";
import { buildDexFloor } from "./dex-floor.ts";
import { buildForecourts } from "./forecourts.ts";
import { buildGalleryArt } from "./gallery-art.ts";
import { buildInsiders } from "./insiders.ts";
import { buildKnocks } from "./knocks.ts";
import { buildMall } from "./mall.ts";
import { buildTrain } from "./train.ts";
import { buildLofts } from "./lofts.ts";
import { buildMountain } from "./mountain.ts";
import { buildParked, type Parked } from "./parked.ts";
import { buildShopMotion } from "./shop-motion.ts";
import { buildShops } from "./shops.ts";
import { buildStreet } from "./street.ts";
import { buildThings } from "./things.ts";
import { buildTraffic } from "./traffic.ts";
import { buildUnderglow } from "./underglow.ts";
import { buildVenues } from "./venues.ts";
import { buildWalkers } from "./walkers.ts";

// Everything at street level that makes Nakasato feel lived in: the furniture and the notices, the walk-in shops and the gas stations'
// forecourts, the parked rides, the people walking and talking, the traffic, the landmarks, the lantern night, the beacon over where to
// go next, the Green Line's stations, the clues frost vision lights, the people filling the landmarks and the bazaar, the DEX's trading
// floor, ADOR's two floors of shops, the Pixel Vault's neon art, the light under the rides at the kerbs, the goods a hero can knock off a
// shelf, and Mount WAGMI with its trail and its sign. It also keeps the time of day, from the day's clock: the sun crosses the sky until
// dusk, and after `nightTick` it is night.
export interface Town {
  // The town between days (the opening and the hero ring): daylight, people and traffic, nobody's quest.
  idle(seconds: number): void;
  // Where the hero's own lantern is (metres), while it rises; null otherwise.
  lantern(seconds: number): readonly [number, number, number] | null;
  // The colour of a parked ride, by its id, and where one left on the street stands.
  paintOf(id: string): string;
  leftAt: Parked["leftAt"];
  readonly root: Group;
  show(
    day: DayState,
    x: number,
    z: number,
    heading: number,
    seconds: number,
    dt: number,
    // A ride left on the street that is drawn elsewhere for a moment (its door shutting).
    hidden?: string,
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

// Whether the hero is near enough to a hall of a kind to see in (metres).
const near = (x: number, z: number, kind: string): boolean =>
  venues.some(
    (venue) =>
      venue.kind === kind &&
      Math.hypot(venue.middle.x / 100 - x, venue.middle.z / 100 - z) < 90,
  );

export function buildTown(): Town {
  const root = new Group();
  root.name = "town";
  const street = buildStreet();
  const shops = buildShops();
  const working = buildShopMotion();
  const parked = buildParked();
  const walkers = buildWalkers();
  const traffic = buildTraffic();
  const venues = buildVenues();
  const lanterns = buildLanterns();
  const beacon = buildBeacon();
  const lofts = buildLofts();
  const concert = buildConcert();
  const food = buildFood();
  const powers = buildPowers();
  const caves = buildCaves();
  const train = buildTrain();
  const clues = buildClues();
  const insiders = buildInsiders();
  const dexFloor = buildDexFloor();
  const bazaar = buildBazaar();
  const knocks = buildKnocks();
  const things = buildThings();
  const mall = buildMall();
  const forecourts = buildForecourts();
  const beats = buildBeatScenes();
  const gallery = buildGalleryArt();
  const underglow = buildUnderglow();
  root.add(
    gallery.root,
    underglow.root,
    things.root,
    beats.root,
    caves.root,
    train.root,
    clues.root,
    insiders.root,
    dexFloor.root,
    bazaar.root,
    knocks.root,
    mall.root,
    forecourts.root,
    powers.root,
    lofts.root,
    concert.root,
    food.root,
    street.root,
    shops.root,
    buildFronts().root,
    buildMountain().root,
    working.root,
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
      lofts.show(null);
      concert.show(null, seconds);
      food.show(null, seconds);
      powers.show(null);
      caves.show(null, seconds);
      train.show(null, seconds);
      clues.show(null, seconds);
      insiders.show(null, null, seconds);
      dexFloor.show(seconds);
      bazaar.show(seconds);
      gallery.show(null, seconds);
      knocks.show(null, seconds, 0);
      things.show(null, null, seconds);
      forecourts.show(null, seconds);
      beats.show(null, { x: 0, z: 0 }, seconds, 0);
    },
    lantern: (seconds) =>
      sent !== null && seconds - sent < lanternShot ? lanterns.where() : null,
    leftAt: (id) => parked.leftAt(id),
    paintOf: (id) => parked.paintOf(id),
    root,
    show(day, x, z, heading, seconds, dt, hidden = "") {
      const { along, dark } = timeOf(day.tick);
      if (day.wish > 0 && wished === 0) sent = seconds;
      if (day.wish === 0) sent = null;
      wished = day.wish;
      street.run(seconds, dark);
      shops.show(x, z, dt);
      working.show(x, z, seconds, day.done);
      parked.show(day, x, z, heading, seconds, hidden);
      walkers.show(seconds, 1 - dark * 0.6, moverOf(day, x, z, heading));
      traffic.show(seconds, along, dark, x, z);
      venues.show(seconds, dark, x, z);
      lanterns.show(dark, seconds, sent);
      const goal = questAt(day);
      beacon.show(goal, x, z, seconds);
      things.show(day, goal, seconds);
      forecourts.show(day, seconds);
      beats.show(day, { x, z }, seconds, dt);
      lofts.show(day);
      concert.show(day, seconds);
      food.show(day, seconds);
      powers.show(day);
      caves.show(day, seconds);
      train.show(day, seconds);
      clues.show(day, seconds);
      insiders.show(day, moverOf(day, x, z, heading), seconds);
      // The halls' insides are drawn only near them, and the bazaar only underground.
      dexFloor.root.visible = near(x, z, "bank");
      mall.root.visible = near(x, z, "store");
      gallery.root.visible = near(x, z, "gallery");
      if (gallery.root.visible) gallery.show(day, seconds);
      underglow.show(day, x, z, seconds, dark);
      bazaar.root.visible = underground(day.x, day.z);
      dexFloor.show(seconds);
      bazaar.show(seconds);
      knocks.show(day, seconds, Math.min(0.1, dt));
    },
    write: (message) => lanterns.write(message),
  };
}
