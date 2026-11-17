import { describe, expect, it } from "vitest";

import { chased } from "../src/rules/chase.ts";
import {
  canClimb,
  clinging,
  onTheRoof,
  roofLevel,
  roofStep,
  storeys,
  streetEdge,
} from "../src/rules/climb.ts";
import { heatPerStar } from "../src/rules/constants.ts";
import { degenRules } from "../src/rules/index.ts";
import { moved } from "../src/rules/move.ts";
import type { DayState, Draft } from "../src/rules/types.ts";
import { lawns, venues } from "../src/rules/venues.ts";
import {
  enterWindow,
  insideOf,
  loftRep,
  shutHeat,
  snackVision,
  windowOf,
} from "../src/rules/windows.ts";
import {
  inPark,
  onRoof,
  onStreet,
  roofDepth,
  wallBeside,
} from "../src/rules/world.ts";
import { refusal, started } from "./support/replay.ts";

// On the pavement of The Exchange's middle street, 70 centimetres south of a building's wall, well clear of the shop door down the row.
const pavement = { x: 15_000, z: 17_100 };
const beside = (): DayState => ({ ...started(5, 7, 1), ...pavement });
const step = (
  state: DayState,
  type: string,
  data: Readonly<Record<string, number>>,
): DayState => {
  const stepped = degenRules.step(state, { data: { ...data }, type });
  if (!stepped.ok) throw new Error(stepped.reason);
  return stepped.state;
};

describe("a wall to climb", () => {
  it("is found beside a building from the pavement, and nowhere else", () => {
    expect(wallBeside(pavement.x, pavement.z)).toEqual({
      east: 0,
      gap: 70,
      south: -1,
    });
    // The middle of a crossroads, the shore at the island's edge, and inside a building are not beside a wall.
    expect(wallBeside(18_000, 18_000)).toBeNull();
    expect(wallBeside(100, 6_000)).toBeNull();
    expect(wallBeside(15_000, 15_000)).toBeNull();
  });

  it("is climbed a storey at a time to the top, and climbed down the same way", () => {
    let day = beside();
    expect([canClimb(day), clinging(day)]).toEqual([true, false]);
    // Climbing stops a walk: the hero takes hold of the wall where they stand.
    day = step({ ...day, dir: 4 }, "lift", { by: 1, tick: 0 });
    expect([day.level, day.dir, clinging(day)]).toEqual([1, -1, true]);
    while (day.level < storeys) day = step(day, "lift", { by: 1, tick: 0 });
    // At the top storey the next climb is onto the roof (below); the act button is the window in front of the hero.
    expect(canClimb(day)).toBe(true);
    expect(step(day, "act", { tick: 0 }).talk?.startsWith("window-")).toBe(
      true,
    );
    const walking = step(day, "move", { dir: 4, tick: 0 });
    const later = step(walking, "look", { tick: 40 });
    expect([later.x, later.z]).toEqual([pavement.x, pavement.z]);
    for (let tick = 41; day.level > 0; tick += 1)
      day = step(day, "lift", { by: -1, tick });
    expect(refusal(day, "lift", { by: -1, tick: 50 })).toBe(
      "no higher or lower than that",
    );
    expect(clinging(day)).toBe(false);
  });

  it("is not climbed away from a wall, in the middle of a talk, or on a ride other than a helicopter", () => {
    const day = started(5, 7, 1);
    expect(wallBeside(day.x, day.z)).toBeNull();
    expect(refusal(day, "lift", { by: 1, tick: 1 })).toBe(
      "nothing to climb here",
    );
    expect(
      refusal({ ...beside(), talk: "home" }, "lift", { by: 1, tick: 1 }),
    ).toBe("answer first");
    expect(canClimb({ ...beside(), talk: "home" })).toBe(false);
    expect(
      refusal({ ...beside(), ride: "car" }, "lift", { by: 1, tick: 1 }),
    ).toBe("only a helicopter climbs");
    // A helicopter still climbs and lands, and only lands on the street.
    const flying = step({ ...day, ride: "heli" }, "lift", { by: 1, tick: 1 });
    expect(flying.level).toBe(1);
    expect(
      refusal({ ...flying, x: 15_000, z: 15_000 }, "lift", { by: -1, tick: 2 }),
    ).toBe("nowhere to land here");
  });

  it("keeps the beat cop waiting underneath, while a tux at four stars still reaches", () => {
    const up: Draft = {
      ...beside(),
      cop: { ...pavement },
      heat: heatPerStar * 2,
      level: 1,
      pocket: 500,
    };
    chased(up);
    expect([up.pocket, up.cop === null]).toEqual([500, false]);
    up.level = 0;
    chased(up);
    expect(up.pocket).toBeLessThan(500);
    const tux: Draft = {
      ...beside(),
      heat: heatPerStar * 4,
      level: 2,
      tux: { ...pavement },
    };
    chased(tux);
    expect([tux.ended, tux.cause]).toEqual([true, "frozen"]);
  });
});

describe("the open ground", () => {
  it("lets a body walk straight from the pavement onto the skate park, the green, the lawns and a hall's plaza", () => {
    for (const venue of venues) {
      const z = (venue.lot.z0 + venue.lot.z1) / 2;
      const into = venue.open ? venue.lot.x0 + 500 : venue.lot.x0 + 150;
      expect([venue.label, onStreet(venue.lot.x0 - 20, z)]).toEqual([
        venue.label,
        true,
      ]);
      expect([venue.label, onStreet(into, venue.lot.z0 + 150)]).toEqual([
        venue.label,
        true,
      ]);
    }
    for (const lawn of lawns) {
      const middle = { x: (lawn.x0 + lawn.x1) / 2, z: (lawn.z0 + lawn.z1) / 2 };
      expect(onStreet(middle.x, middle.z)).toBe(true);
      expect(inPark(middle.x, middle.z)).toBe(true);
    }
    // A walk east along the skate park's middle line, from the avenue's pavement, ends inside it.
    const skate = venues.find((venue) => venue.kind === "skate");
    const from = (skate?.lot.x0 ?? 0) - 200;
    const z = ((skate?.lot.z0 ?? 0) + (skate?.lot.z1 ?? 0)) / 2;
    const walker: Draft = { ...started(5, 7, 1), dir: 0, x: from, z };
    for (let tick = 0; tick < 60; tick += 1) moved(walker);
    expect(walker.x).toBeGreaterThan((skate?.lot.x0 ?? 0) + 300);
  });
});

describe("roofs and windows", () => {
  const top = (): DayState => ({ ...beside(), level: storeys });

  it("let a climber at the top of a wall step onto the roof, walk its ring, and climb down at an edge over a street", () => {
    expect(canClimb(top())).toBe(true);
    let day = step(top(), "lift", { by: 1, tick: 0 });
    expect([day.level, onTheRoof(day), clinging(day)]).toEqual([
      roofLevel,
      true,
      false,
    ]);
    expect([day.x, day.z]).toEqual([pavement.x, pavement.z - 190]);
    expect(onRoof(day.x, day.z)).toBe(true);
    expect(canClimb(day)).toBe(false);
    expect(refusal(day, "act", { tick: 0 })).toBe("climb down first");
    // Along the ring, and no further in than its back edge over the courtyard.
    day = step(step(day, "move", { dir: 12, tick: 0 }), "look", { tick: 200 });
    expect(day.z).toBeGreaterThanOrEqual(17_000 - roofDepth);
    expect(day.z).toBeLessThan(pavement.z - 400);
    expect(refusal(day, "lift", { by: -1, tick: 200 })).toBe(
      "walk to the roof's edge first",
    );
    day = step(step(day, "move", { dir: 4, tick: 200 }), "look", {
      tick: 400,
    });
    expect(streetEdge(day.x, day.z)).not.toBeNull();
    day = step(step(day, "move", { dir: -1, tick: 400 }), "lift", {
      by: -1,
      tick: 400,
    });
    expect([day.level, clinging(day), onStreet(day.x, day.z)]).toEqual([
      storeys,
      true,
      true,
    ]);
    expect(
      refusal({ ...day, level: roofLevel }, "lift", { by: 1, tick: 400 }),
    ).toBe("no higher or lower than that");
  });

  it("find no roof over a wall with none behind it", () => {
    expect(roofStep({ x: 18_000, z: 18_000 })).toBeNull();
    expect(
      refusal({ ...top(), x: 18_000, z: 18_000 }, "lift", { by: 1, tick: 0 }),
    ).toBe("no roof up there");
    // The courtyard behind a ring of buildings and a landmark's lot are no roof.
    expect([onRoof(15_000, 15_000), onRoof(-5, 100)]).toEqual([false, false]);
  });

  it("let a climber in at the window in front of them, once a window a day, to find who is in", () => {
    for (let seed = 1; seed < 24; seed += 1) {
      const day: Draft = {
        ...started(seed, 7, 1),
        ...pavement,
        heat: 0,
        level: 1,
        rep: 0,
        vision: 0,
      };
      const id = windowOf(day);
      expect(enterWindow(day)).toBeNull();
      const inside = insideOf(day.seed, id);
      expect(day.talk).toBe(`window-${inside}`);
      expect([day.vision, day.rep, day.heat]).toEqual([
        inside === "snack" ? snackVision : 0,
        inside === "loft" ? loftRep : 0,
        inside === "shut" ? shutHeat : 0,
      ]);
      day.talk = null;
      expect(enterWindow(day)).toBe("that window is shut now");
      expect(windowOf({ ...day, level: 2 })).not.toBe(id);
    }
    const seen = new Set<string>();
    for (let seed = 1; seed < 80; seed += 1)
      seen.add(insideOf(seed, windowOf({ level: 1, ...pavement })));
    expect([...seen].sort()).toEqual(["empty", "loft", "shut", "snack"]);
    // The act button is the window while clinging.
    const up = step({ ...beside(), level: 2 }, "act", { tick: 0 });
    expect(up.talk?.startsWith("window-")).toBe(true);
  });
});
