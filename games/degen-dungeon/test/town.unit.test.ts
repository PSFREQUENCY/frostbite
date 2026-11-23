import { describe, expect, it } from "vitest";

import {
  borrowHeat,
  candleTicks,
  gaitTenths,
  heatFadeTicks,
  visionTicks,
} from "../src/rules/constants.ts";
import { advance } from "../src/rules/day.ts";
import { degenRules } from "../src/rules/index.ts";
import { paceOf } from "../src/rules/move.ts";
import { spotNamed, spots } from "../src/rules/places.ts";
import { inRoom, roomAt, rooms } from "../src/rules/rooms.ts";
import { counters } from "../src/rules/counters.ts";
import { nodes } from "../src/rules/talk.ts";
import type { DayState } from "../src/rules/types.ts";
import { onLand, onStreet } from "../src/rules/world.ts";
import { talks } from "../src/script/lines.ts";
import { createBot } from "./support/bot.ts";
import { parkedNear } from "./support/night.ts";
import { refusal, started } from "./support/replay.ts";

function step(
  day: DayState,
  type: string,
  data: Readonly<Record<string, number>>,
): DayState {
  const stepped = degenRules.step(day, {
    data: { ...data, tick: day.tick },
    type,
  });
  if (!stepped.ok) throw new Error(stepped.reason);
  return stepped.state;
}
// A shop's counter, answered: buy (0) then leave (always the last answer).
const bought = (day: DayState, kind: string): DayState =>
  step(step({ ...day, talk: `shop-${kind}` }, "pick", { choice: 0 }), "pick", {
    choice: (nodes[`shop-${kind}`]?.length ?? 2) - 1,
  });

describe("the mom-and-pop shops", () => {
  it("are rooms cut into corner lots, with a doorway onto the street: open to feet, closed to wheels", () => {
    // Seventeen shops on the middle streets, thirteen on the lots' outer sides (seven corner stores and six gas stations), and a loft
    // for each of the ten heroes.
    expect(rooms).toHaveLength(40);
    expect(new Set(rooms.map(({ id }) => id)).size).toBe(40);
    expect(rooms.filter(({ kind }) => kind === "loft")).toHaveLength(10);
    expect(rooms.filter(({ kind }) => kind === "bodega")).toHaveLength(9);
    expect(rooms.filter(({ kind }) => kind === "gas")).toHaveLength(6);
    for (const room of rooms) {
      const { counter, door } = room;
      expect(onStreet(counter.x, counter.z), room.id).toBe(false);
      expect([
        onLand(counter.x, counter.z),
        inRoom(counter.x, counter.z),
      ]).toEqual([true, true]);
      expect(roomAt(counter.x, counter.z)).toBe(room);
      const outside = room.north ? door.z0 : door.z1;
      expect(onStreet(counter.x, outside), room.id).toBe(true);
      expect(onLand(room.room.x0 - 100, counter.z)).toBe(false);
      // A shop's counter, or the bed in a loft.
      expect(
        spotNamed(room.id) ?? spotNamed(`home-${room.id.replace("loft-", "")}`),
      ).toMatchObject(
        room.kind === "loft"
          ? { kind: "home", ...counter }
          : { kind: "talk", node: `shop-${room.kind}` },
      );
    }
    const shop = rooms[0];
    if (shop === undefined) throw new Error("no shops");
    const street = shop.north ? shop.door.z0 - 100 : shop.door.z1 + 100;
    const inward = shop.north ? 4 : 12;
    for (const ride of ["foot", "car", "bike"] as const) {
      const start = {
        ...started(1, 7, 3),
        ride,
        x: shop.counter.x,
        z: street,
      };
      const after = advance(step(start, "move", { dir: inward }), 200);
      expect(roomAt(after.x, after.z) === shop, ride).toBe(ride === "foot");
    }
  });

  it("sell what their kind sells, for DUN in the pocket, and say what it costs", () => {
    const day = {
      ...started(3, 7, 5),
      fomo: 50,
      heat: 200,
      peak: 200,
      tick: 600,
      vision: 0,
    };
    expect(bought(day, "coffee")).toMatchObject({
      fomo: 25,
      pocket: day.pocket - 5,
      talk: null,
    });
    expect(bought(day, "noodles")).toMatchObject({
      fomo: 40,
      rep: day.rep + 2,
    });
    expect(bought(day, "pizza").vision).toBe(150);
    expect(bought(day, "bodega").vision).toBe(90);
    expect(bought({ ...day, vision: 2 * visionTicks }, "hardware").vision).toBe(
      2 * visionTicks,
    );
    expect(bought(day, "barber").heat).toBe(100);
    expect(bought(day, "laundry").heat).toBe(150);
    expect(bought(day, "gym").rep).toBe(day.rep + 5);
    expect(bought(day, "bait").rep).toBe(day.rep + 2);
    const play = (from: DayState, game: number): DayState =>
      step({ ...from, talk: "shop-arcade" }, "pick", { choice: game });
    const claw = play({ ...day, tick: 0 }, 0);
    expect([claw.pocket, claw.made]).toEqual([day.pocket + 20, day.made + 30]);
    expect(refusal(claw, "pick", { choice: 0, tick: 0 })).toBe(
      "you have played that one today",
    );
    const later = { ...day, tick: candleTicks };
    expect(play(later, 1).pocket).toBe(day.pocket - 10);
    expect(play(later, 2).made).toBe(day.made + 20);
    expect(play(later, 3).rep).toBe(day.rep + 3);
    expect(step(claw, "pick", { choice: 4 }).talk).toBeNull();
    expect(
      refusal({ ...day, pocket: 0, talk: "shop-gym" }, "pick", {
        choice: 0,
        tick: 600,
      }),
    ).toBe("not enough DUN");
    const pawned = bought({ ...day, hot: 1_000 }, "pawn");
    expect([pawned.pocket, pawned.made, pawned.fenced, pawned.hot]).toEqual([
      day.pocket + 400,
      day.made + 400,
      400,
      0,
    ]);
    expect(
      refusal({ ...day, talk: "shop-pawn" }, "pick", { choice: 0, tick: 600 }),
    ).toBe("nothing to pawn");
    for (const [kind, price] of Object.entries(counters)) {
      const words = talks[`shop-${kind}`];
      expect(words?.answers.length).toBe(nodes[`shop-${kind}`]?.length);
      if (kind !== "pawn")
        expect(words?.answers[0]).toMatch(new RegExp(`, ${String(price)}$`));
    }
  });
});

describe("parked rides", () => {
  const parked = spots.filter((spot) => spot.kind === "parked");

  it("line the kerbs of every borough: cars most of all, then scooters, bikes, minivans, motorbikes, pickups and cabs, all on the street", () => {
    const count = (ride: string): number =>
      parked.filter((spot) => spot.kind === "parked" && spot.ride === ride)
        .length;
    expect(parked.length).toBeGreaterThan(150);
    const kinds = ["bike", "car", "moto", "scooter", "semi", "truck", "van"];
    for (const kind of kinds) expect(count(kind), kind).toBeGreaterThan(4);
    expect(kinds.reduce((sum, kind) => sum + count(kind), 0)).toBe(
      parked.length,
    );
    expect(count("car")).toBeGreaterThan(count("scooter"));
    expect(count("scooter")).toBeGreaterThan(count("semi"));
    for (const spot of parked)
      expect(onStreet(spot.x, spot.z), spot.id).toBe(true);
  });

  it("can be taken from the kerb once a day each and again where left: an engine brings heat, a scooter or a bike none", () => {
    const bot = createBot(2, 7, 3);
    const home = bot.here();
    const car = parkedNear("car", home.x, home.z);
    bot.use(car.id);
    expect([bot.here().ride, bot.here().heat]).toEqual(["car", borrowHeat]);
    expect(paceOf(bot.here())).toBe(32);
    const scooter = parkedNear("scooter", car.x, car.z);
    bot.use(scooter.id);
    expect(bot.here().ride).toBe("foot");
    bot.act();
    expect([bot.here().ride, bot.here().rideId]).toEqual([
      "scooter",
      scooter.id,
    ]);
    bot.act();
    expect(bot.here().ride).toBe("foot");
    expect(bot.here().left.map((ride) => ride.id)).toEqual([
      car.id,
      scooter.id,
    ]);
    // The ride just left is the one taken again; off the street, the kerb is used up.
    bot.act();
    expect([bot.here().ride, bot.here().left.length]).toEqual(["scooter", 1]);
    bot.act();
    expect(
      refusal({ ...bot.here(), left: [] }, "act", { tick: bot.here().tick }),
    ).toBe("that is used up for today");
    const bike = parkedNear("bike", scooter.x, scooter.z);
    bot.use(bike.id);
    expect([bot.here().ride, paceOf(bot.here())]).toEqual(["bike", 18]);
    expect(bot.here().heat).toBeLessThan(borrowHeat);
  });
});

describe("moving on foot", () => {
  it("walks, runs, crouches or crawls, each at its own pace, and wheels keep their own", () => {
    const day = started(1, 7, 3);
    const walk = paceOf(day);
    const paces = gaitTenths.map((_, gait) => paceOf({ ...day, gait }));
    expect(paces[0]).toBe(walk);
    expect(paces[1]).toBeGreaterThan(walk);
    expect(paces[3]).toBeLessThan(paces[2] ?? 0);
    expect(paceOf({ ...day, gait: 1, ride: "car" })).toBe(32);
    expect(refusal(day, "gait", { mode: 0, tick: 0 })).toBe(
      "already moving that way",
    );
    for (const mode of [-1, 4, 1.5])
      expect(refusal(day, "gait", { mode, tick: 0 })).toBe(
        "mode must be 0 to 3",
      );
    expect(step(day, "gait", { mode: 3 }).gait).toBe(3);
  });

  it("lets heat fade twice as fast while crouching or crawling, not while riding", () => {
    const hot = { ...started(1, 7, 3), heat: 100, peak: 100 };
    const after = (gait: number, ride: DayState["ride"]) =>
      100 - advance({ ...hot, gait, ride }, 20 * heatFadeTicks).heat;
    expect(after(0, "foot")).toBe(20);
    expect(after(2, "foot")).toBe(40);
    expect(after(3, "foot")).toBe(40);
    expect(after(3, "scooter")).toBe(20);
  });
});
