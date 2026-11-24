import { expectVerifiedScore } from "@frostbite/test-kit/verified-score";
import { describe, expect, it } from "vitest";

import { degenRules } from "../src/rules/index.ts";
import { sampleRun } from "../src/sample-run.ts";
import { replay } from "./support/replay.ts";

describe("the sample day the verifier is shown with", () => {
  it("is legal, ends at home and earns exactly the milestones it claims: the seed paper's (Frost's speech has none)", () => {
    const sample = sampleRun();
    const day = replay(sample);
    expect(day.cause).toBe("home");
    expect(degenRules.earned(day)).toEqual(sample.claims);
    // What the day made, less the rent.
    expect(day.pocket).toBe(240);
  });

  it("scores what the day made, once it has ended, and nothing before", () => {
    expectVerifiedScore(
      degenRules,
      sampleRun(),
      (state) => state.made + state.storm + state.fate * 500,
    );
  });
});
