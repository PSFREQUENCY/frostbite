import { describe, expect, it } from "vitest";

import { removed, scrubDeep } from "../src/scrubber.ts";

const uuid = "3f2a9c1e-5b7d-4e8a-9c0d-1a2b3c4d5e6f";

describe("scrubDeep", () => {
  it("scrubs a text at any depth, in objects and in lists", () => {
    const payload = {
      $exception_list: [
        {
          stacktrace: { frames: [{ function: `f ${uuid}` }] },
          value: "for a@b.co",
        },
      ],
      count: 3,
      flag: true,
      nothing: null,
    };
    expect(scrubDeep(payload)).toEqual({
      $exception_list: [
        {
          stacktrace: { frames: [{ function: `f ${removed}` }] },
          value: `for ${removed}`,
        },
      ],
      count: 3,
      flag: true,
      nothing: null,
    });
  });

  it("stops following a payload past a depth, so a cycle cannot run forever", () => {
    const deep = Array.from({ length: 30 }).reduce<Record<string, unknown>>(
      (inner) => ({ inner }),
      { leaf: "a@b.co" },
    );
    expect(JSON.stringify(scrubDeep(deep as never))).toContain(removed);
    expect(JSON.stringify(scrubDeep(deep as never))).not.toContain("a@b.co");
  });
});
