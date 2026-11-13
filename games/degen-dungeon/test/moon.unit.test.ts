import { describe, expect, it } from "vitest";

import {
  heatPerStar,
  moon,
  moonFare,
  shuttleBooth,
} from "../src/rules/constants.ts";
import { advance } from "../src/rules/day.ts";
import { degenRules } from "../src/rules/index.ts";
import { spotNamed } from "../src/rules/places.ts";
import type { DayState } from "../src/rules/types.ts";
import { onLand, onMoon } from "../src/rules/world.ts";
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
// Stands on a spot and opens it.
const at = (day: DayState, id: string): DayState => {
  const spot = spotNamed(id);
  if (spot === undefined) throw new Error(id);
  return step({ ...day, x: spot.x, z: spot.z }, "act");
};

describe("the trip to the moon", () => {
  it("sells a seat under Moon Tower for 500,000 DUN, from the pocket and then the freezer, to nobody riding or wanted", () => {
    const rich = {
      ...started(5, 7, 5),
      freezer: 100_000,
      pocket: moonFare - 50_000,
    };
    const booth = at(rich, "shuttle");
    expect(booth.talk).toBe("shuttle");
    expect(
      refusal({ ...booth, freezer: 0 }, "pick", { choice: 0, tick: 0 }),
    ).toBe("a seat costs 500,000 DUN");
    expect(
      refusal({ ...booth, ride: "scooter" }, "pick", { choice: 0, tick: 0 }),
    ).toBe("leave the ride you are on first");
    expect(
      refusal({ ...booth, heat: heatPerStar }, "pick", { choice: 0, tick: 0 }),
    ).toBe("the shuttle boards nobody with heat on them");
    const up = step(booth, "pick", { choice: 0 });
    expect([up.pocket, up.freezer]).toEqual([0, 50_000]);
    expect(onMoon(up.x, up.z)).toBe(true);
    expect(up.done).toContain("moon");
    expect(onLand(up.x, up.z)).toBe(false);
    expect(talks.shuttle?.answers[0]).toContain("500,000");
  });

  it("lets the hero walk the moon's ground but not off it, meet the colony and take one rock, then fly home", () => {
    const landed = {
      ...started(5, 7, 5),
      x: (moon.x0 + moon.x1) / 2,
      z: (moon.z0 + moon.z1) / 2,
    };
    const walked = advance(step(landed, "move", { dir: 0 }), 3_000);
    expect(walked.x).toBeLessThan(moon.x1);
    expect(walked.x).toBeGreaterThan(moon.x1 - 200);
    const met = step(at(landed, "colony"), "pick", { choice: 0 });
    expect([met.done.includes("colony"), met.rep]).toEqual([
      true,
      landed.rep + 25,
    ]);
    const rock = step(at(met, "crater"), "pick", { choice: 0 });
    expect([rock.done.includes("moon-rock"), rock.rep]).toEqual([
      true,
      met.rep + 50,
    ]);
    expect(
      refusal({ ...rock, talk: "crater" }, "pick", {
        choice: 0,
        tick: rock.tick,
      }),
    ).toBe("you have been here today");
    const home = step(at(rock, "moon-pad"), "pick", { choice: 0 });
    expect([home.x, home.z]).toEqual([shuttleBooth.x, shuttleBooth.z]);
    expect(onLand(home.x, home.z)).toBe(true);
  });
});
