import { describe, expect, it } from "vitest";

import {
  shotPays,
  shotStakes,
  shotWindow,
  visionTicks,
} from "../src/rules/constants.ts";
import { advance } from "../src/rules/day.ts";
import { degenRules } from "../src/rules/index.ts";
import { hits } from "../src/rules/moonshot.ts";
import { spotNamed } from "../src/rules/places.ts";
import type { DayState } from "../src/rules/types.ts";
import { bankStep, inVenue, venueAt, venues } from "../src/rules/venues.ts";
import { onStreet } from "../src/rules/world.ts";
import { talks } from "../src/script/lines.ts";
import { refusal, started } from "./support/replay.ts";

const step = (
  day: DayState,
  type: string,
  data: Readonly<Record<string, number>> = {},
): DayState => {
  const stepped = degenRules.step(day, {
    data: { ...data, tick: day.tick },
    type,
  });
  if (!stepped.ok) throw new Error(stepped.reason);
  return stepped.state;
};
const pick = (day: DayState, talk: string, choice: number): DayState =>
  step({ ...day, talk }, "pick", { choice });

describe("the landmarks you can walk into", () => {
  it("have a floor behind a doorway from the street (or an open lot), feet only, with something to do on each", () => {
    expect(venues).toHaveLength(14);
    for (const venue of venues) {
      const { door, middle, out } = venue;
      expect([
        inVenue(middle.x, middle.z),
        venueAt(middle.x, middle.z),
      ]).toEqual([true, venue]);
      const spot = spotNamed(venue.id);
      expect(spot === undefined ? false : inVenue(spot.x, spot.z)).toBe(true);
      expect(talks[spot?.kind === "talk" ? spot.node : ""]).toBeDefined();
      if (door === null) continue;
      const street = out === 1 ? door.z1 - 100 : door.z0 + 100;
      expect(onStreet(middle.x, street), venue.id).toBe(true);
      for (const ride of ["foot", "scooter"] as const) {
        const outside = { ...started(1, 7, 2), ride, x: middle.x, z: street };
        const walked = advance(
          step(outside, "move", { dir: out === 1 ? 12 : 4 }),
          600,
        );
        expect(
          venueAt(walked.x, walked.z) === venue,
          `${venue.id} ${ride}`,
        ).toBe(ride === "foot");
      }
    }
  });

  it("each do their thing once a day: calm, standing, frost vision, a cooler head, a little income", () => {
    const day = {
      ...started(3, 7, 4),
      fomo: 60,
      heat: 100,
      peak: 100,
      pocket: 1_000,
      rep: 10,
      vision: 0,
    };
    const danced = pick(day, "do-dance", 0);
    expect([danced.pocket, danced.fomo, danced.rep]).toEqual([980, 30, 14]);
    expect(
      refusal({ ...danced, talk: "do-dance" }, "pick", {
        choice: 0,
        tick: day.tick,
      }),
    ).toBe("you have done that today");
    expect(pick(day, "do-vr", 0).vision).toBe(300);
    expect(pick({ ...day, vision: 2 * visionTicks }, "do-read", 0).vision).toBe(
      2 * visionTicks,
    );
    expect(pick(day, "do-film", 0).heat).toBe(60);
    const live = pick(day, "do-live", 0);
    expect([live.pocket, live.made]).toEqual([1_300, day.made + 300]);
    expect(
      refusal({ ...day, pocket: 100, talk: "do-print" }, "pick", {
        choice: 0,
        tick: day.tick,
      }),
    ).toBe("not enough DUN");
    expect(pick(day, "do-skate", 1).talk).toBeNull();
  });

  it("keep a bank whose teller moves DUN between pocket and freezer, but not on the morning the freezer looks empty", () => {
    const day = { ...started(3, 7, 4), freezer: 500, pocket: 1_500 };
    const frozen = pick(day, "bank", 0);
    expect([frozen.pocket, frozen.freezer, frozen.talk]).toEqual([
      500,
      500 + bankStep,
      "bank",
    ]);
    const thawed = step(frozen, "pick", { choice: 1 });
    expect([thawed.pocket, thawed.freezer]).toEqual([1_500, 500]);
    expect(
      refusal({ ...day, talk: "bank" }, "pick", { choice: 1, tick: 0 }),
    ).toBe("not enough in the freezer");
    expect(
      refusal({ ...day, pocket: 10, talk: "bank" }, "pick", {
        choice: 0,
        tick: 0,
      }),
    ).toBe("not enough DUN");
    expect(
      refusal({ ...day, fake: true, talk: "bank" }, "pick", {
        choice: 0,
        tick: 0,
      }),
    ).toBe("the teller cannot find your freezer this morning");
  });
});

describe("the moonshot", () => {
  it("rides a stake on the next launch, where about one in thirty goes a hundred times up and the rest go to nothing", () => {
    const launches = Array.from({ length: 3_000 }, (_, launch) =>
      hits(7, launch),
    ).filter(Boolean).length;
    expect(launches).toBeGreaterThan(60);
    expect(launches).toBeLessThan(140);
    const lucky =
      Array.from({ length: 200 }, (_, seed) => seed).find((seed) =>
        hits(seed, 1),
      ) ?? -1;
    const unlucky =
      Array.from({ length: 200 }, (_, seed) => seed).find(
        (seed) => !hits(seed, 1),
      ) ?? -1;
    const day = (seed: number): DayState => ({
      ...started(seed, 7, 5),
      pocket: 20_000,
      tick: 10,
    });
    const staked = pick(day(lucky), "launchpad", 1);
    expect([staked.pocket, staked.shot, staked.shotAt]).toEqual([
      15_000,
      shotStakes[1],
      shotWindow,
    ]);
    expect(
      refusal({ ...staked, talk: "launchpad" }, "pick", {
        choice: 0,
        tick: 10,
      }),
    ).toBe("your moonshot is still in the air");
    const landed = advance(staked, shotWindow);
    expect([landed.shot, landed.pocket]).toEqual([
      0,
      15_000 + 5_000 * shotPays,
    ]);
    expect(landed.done).toContain("moonshot");
    expect(landed.made).toBe(staked.made + 5_000 * (shotPays - 1));
    const rugged = advance(pick(day(unlucky), "launchpad", 0), shotWindow);
    expect([
      rugged.shot,
      rugged.pocket,
      rugged.done.includes("moonshot"),
    ]).toEqual([0, 19_000, false]);
    expect(
      refusal({ ...day(lucky), pocket: 500, talk: "launchpad" }, "pick", {
        choice: 0,
        tick: 10,
      }),
    ).toBe("not enough DUN");
  });
});
