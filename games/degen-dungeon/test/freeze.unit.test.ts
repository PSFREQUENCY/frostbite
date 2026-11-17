import { describe, expect, it } from "vitest";

import { crowdAt, crowdSize, gatheringAt } from "../src/rules/crowd.ts";
import { advance } from "../src/rules/day.ts";
import {
  alongRay,
  mostFrozen,
  rayCooldown,
  rayReach,
  subZero,
  targetsOf,
  thawTicks,
} from "../src/rules/freeze.ts";
import { degenRules } from "../src/rules/index.ts";
import { spots } from "../src/rules/places.ts";
import type { DayState, Frost } from "../src/rules/types.ts";
import { armed, subZeroDay } from "./support/freeze.ts";
import { refusal, started } from "./support/replay.ts";

function step(
  state: DayState,
  type: string,
  data: Readonly<Record<string, number>> = {},
): DayState {
  const stepped = degenRules.step(state, {
    data: { ...data, tick: state.tick },
    type,
  });
  if (!stepped.ok) throw new Error(stepped.reason);
  return stepped.state;
}
// A kerb ride, and a masked hero with the ray standing a few metres west of it, facing east.
const kerb = spots.find((spot) => spot.kind === "parked");
if (kerb === undefined) throw new Error("no parked ride");
const aimed: DayState = {
  ...started(3, 7, 2),
  facing: 0,
  form: 0,
  gun: true,
  tick: 600,
  won: true,
  x: kerb.x - 500,
  z: kerb.z,
};
const shot = (day: DayState): DayState => step(day, "shoot");

describe("the freeze ray", () => {
  it("comes out of Cold Harbor Deli's frost only for a statue's face", () => {
    const deli = spots.find((spot) => spot.id === "freezer-room-0-0-out");
    if (deli === undefined) throw new Error("no freezer");
    const bare = { ...started(3, 7, 2), x: deli.x, z: deli.z };
    const asked = step(bare, "act");
    expect(asked.talk).toBe("freezer-ray");
    expect(refusal(asked, "pick", { choice: 0, tick: 0 })).toBe(
      "the frost only opens for a statue's face",
    );
    const taken = step({ ...asked, form: 0, won: true }, "pick", { choice: 0 });
    expect([taken.gun, taken.talk]).toEqual([true, null]);
    expect(
      refusal({ ...taken, talk: "freezer-ray" }, "pick", {
        choice: 0,
        tick: 0,
      }),
    ).toBe("the freeze ray is already in your hands");
    // The bot's way there: a mask on Cold Harbor's middle street, then in at the deli's door.
    expect(armed().here().gun).toBe(true);
  });

  it("fires along the last heading, freezing everything it passes through, and only with the mask on, on foot, between pauses", () => {
    const frozen = shot(aimed);
    expect(frozen.frozen).toEqual([{ id: kerb.id, until: 600 + thawTicks }]);
    expect(frozen.heat).toBe(aimed.heat + 4);
    expect(refusal(frozen, "shoot", { tick: 600 + rayCooldown - 1 })).toBe(
      "the freeze ray is still cold-charging",
    );
    // Facing away, aside, or out of reach, it misses.
    expect(shot({ ...aimed, facing: 8 }).frozen).toEqual([]);
    expect(shot({ ...aimed, z: kerb.z + 200 }).frozen).toEqual([]);
    expect(shot({ ...aimed, x: kerb.x - rayReach - 100 }).frozen).toEqual([]);
    expect(alongRay(aimed, kerb)).toBe(500);
    // A move sets the heading it fires along.
    expect(step({ ...aimed, facing: 8 }, "move", { dir: 0 }).facing).toBe(0);
    for (const [state, reason] of [
      [{ ...aimed, gun: false }, "nothing to shoot with"],
      [
        { ...aimed, form: -1 },
        "the freeze ray answers only to a statue's face",
      ],
      [{ ...aimed, talk: "freezer" }, "answer first"],
      [
        { ...aimed, ride: "bike" as const },
        "the freeze ray needs both hands: get off the ride",
      ],
    ] as const)
      expect(refusal(state, "shoot", { tick: 600 })).toBe(reason);
  });

  it("thaws each thing half a minute after it froze, and holds no more than sixty-three at once", () => {
    const frozen = shot(aimed);
    expect(advance(frozen, 600 + thawTicks - 1).frozen).toHaveLength(1);
    expect(advance(frozen, 600 + thawTicks).frozen).toEqual([]);
    const full: readonly Frost[] = Array.from(
      { length: mostFrozen },
      (_, index) => ({
        id: `crowd-${String(index)}`,
        until: 2_000,
      }),
    );
    expect(refusal({ ...aimed, frozen: full }, "shoot", { tick: 600 })).toBe(
      "the tank is spent until something thaws",
    );
    const nearly = shot({ ...aimed, frozen: full.slice(1) });
    expect([nearly.frozen.length, nearly.peakFrozen]).toEqual([
      mostFrozen,
      mostFrozen,
    ]);
  });

  it("keeps what it froze still: a ride cannot be taken, nobody frozen can be talked to, and a frozen chaser waits", () => {
    const frozen = shot(aimed);
    expect(
      refusal({ ...frozen, x: kerb.x, z: kerb.z }, "act", { tick: 600 }),
    ).toBe("frozen solid: give it half a minute");
    const frost = spots.find((spot) => spot.id === "frost");
    if (frost === undefined) throw new Error("no Frost");
    const iced = {
      ...aimed,
      frozen: [{ id: "person-frost", until: 5_000 }],
      x: frost.x,
      z: frost.z,
    };
    expect(refusal(iced, "act", { tick: 600 })).toBe(
      "frozen solid: give it half a minute",
    );
    const chased = {
      ...aimed,
      cop: { x: aimed.x + 300, z: aimed.z },
      heat: 250,
    };
    const caught = shot(chased);
    expect(caught.frozen.map(({ id }) => id)).toContain("cop");
    expect(advance(caught, 700).cop).toEqual(chased.cop);
    expect(advance(chased, 620).cop).not.toEqual(chased.cop);
  });

  it("finds the crowds where the rules stand them, the people at places, and nobody behind bulletproof glass", () => {
    const riot = { ...started(3, 7, 1), done: [] };
    expect(gatheringAt(riot)).toBe("riot");
    expect(gatheringAt({ ...riot, done: ["speech"] })).toBeNull();
    expect(gatheringAt({ ...started(3, 7, 6), beat: 1 })).toBe("party");
    expect(gatheringAt({ ...started(3, 7, 6), beat: 1, gate: 1 })).toBeNull();
    expect(crowdAt("riot", 7)).toEqual(crowdAt("riot", 7));
    const ids = targetsOf(riot).map(({ id }) => id);
    expect(ids.filter((id) => id.startsWith("crowd-"))).toHaveLength(crowdSize);
    expect(ids).toContain("person-frost");
    expect(
      ids.some(
        (id) =>
          id.includes("room-0-0-out") ||
          id.includes("freezer") ||
          id.includes("atm"),
      ),
    ).toBe(false);
  });

  it("earns Sub-Zero with thirty-six frozen at once: a sweep through the riot", () => {
    const day = subZeroDay().state();
    expect(day.peakFrozen).toBeGreaterThanOrEqual(subZero);
    expect(degenRules.earned(day)).toContain("sub-zero");
    expect(
      degenRules.earned({ ...day, peakFrozen: subZero - 1 }),
    ).not.toContain("sub-zero");
  });
});
