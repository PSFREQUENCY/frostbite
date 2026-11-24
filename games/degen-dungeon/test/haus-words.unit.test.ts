import { describe, expect, it } from "vitest";

import { noteFor } from "../src/page/hud.ts";
import { goalFor, talkOf } from "../src/page/words.ts";
import { questAt } from "../src/quest.ts";
import { drops } from "../src/rules/deal.ts";
import { nodes } from "../src/rules/talk.ts";
import { haus, liftAt } from "../src/rules/haus.ts";
import type { DayState } from "../src/rules/types.ts";
import {
  floorLines,
  floorName,
  hausTalks,
  jobLine,
  liftLine,
  repoLine,
} from "../src/script/haus.ts";
import { started } from "./support/replay.ts";

const day = (more: Partial<DayState> = {}): DayState => ({
  ...started(1, 7, 3),
  ...more,
});

describe("the words of Haus De Savage", () => {
  it("has a line and every answer for each of its talks", () => {
    for (const [node, words] of Object.entries(hausTalks)) {
      if (node.startsWith("do-")) continue;
      expect(words.answers.length, node).toBe(nodes[node]?.length);
    }
  });

  it("names the floors, the elevator's way and each Diamond Hands job", () => {
    expect([0, 7, 20, 21].map(floorName)).toEqual([
      "the lobby",
      "floor 7",
      "the penthouse floor",
      "the rooftop",
    ]);
    expect(liftLine(21)).toBe("Glass elevator, on its way to the rooftop.");
    expect(jobLine(3)).toContain("Ms. Opal's yacht");
    expect(jobLine(9)).toBe("Diamond Hands job 9/3: ");
    expect(floorLines(9, true)[0]).toContain("R and F ride");
    expect(floorLines(9, true)[1]).toContain("Climb and Drop ride");
    expect(floorLines(9, false)[0]).toContain("south side");
  });

  it("tells Pip's line in the elevator, on a job, and the morning the car was taken back", () => {
    expect(goalFor(day({ elevator: { at: 0, from: 0, to: 5 } }))).toBe(
      liftLine(5),
    );
    expect(goalFor(day({ dhJob: 2 }))).toBe(jobLine(2));
    expect(goalFor(day({ done: ["repossessed"], tick: 10 }))).toBe(repoLine);
    expect(goalFor(day({ done: ["repossessed"], tick: 2_000 }))).not.toBe(
      repoLine,
    );
  });

  it("fills the elevator's panel with the floor it stands at", () => {
    const panel = talkOf(day({ floor: 12, talk: "haus-lift" }));
    expect(panel?.say).toContain("at floor 12");
    expect(panel?.answers).toHaveLength(5);
  });

  it("notes where the hero is in the tower, and points the beacon at a job's drop", () => {
    expect(noteFor(day({ elevator: { at: 0, from: 3, to: 0 } }))).toBe(
      liftLine(0),
    );
    expect(noteFor(day({ x: liftAt.x, z: liftAt.z }))).toContain(
      "in the glass elevator",
    );
    expect(noteFor(day({ floor: 5, x: haus.x - 900, z: haus.z }))).toContain(
      "south side of the trunk",
    );
    expect(
      noteFor(day({ floor: 20, keycard: true, x: haus.x, z: haus.z - 500 })),
    ).toContain("Your penthouse");
    expect(questAt(day({ dhJob: 2 }))).toEqual(drops[1]);
  });
});
