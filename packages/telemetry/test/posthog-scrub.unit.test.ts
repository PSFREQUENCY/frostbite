import { describe, expect, it } from "vitest";

import { removed } from "../src/scrubber.ts";
import { scrubPostHogRecord } from "../src/providers-shared/posthog-scrub.ts";

const uuid = "3f2a9c1e-5b7d-4e8a-9c0d-1a2b3c4d5e6f";
const keep = { dropSourceContext: false };

describe("the PostHog event scrub", () => {
  it("scrubs the message the library nests inside the exception list", () => {
    const scrubbed = scrubPostHogRecord(
      { $exception_list: [{ type: "Error", value: "uncaught for a@b.co" }] },
      keep,
    );
    expect(JSON.stringify(scrubbed)).not.toContain("a@b.co");
    expect(JSON.stringify(scrubbed)).toContain(removed);
  });

  it("makes the addresses the library records anonymous: no query, no hash, ids in the path become :id", () => {
    const scrubbed = scrubPostHogRecord(
      {
        $current_url: `https://frostbit.example/s/${uuid}?code=SECRET#top`,
        $referrer: "https://elsewhere.example/page?token=abc",
        $exception_list: [
          {
            stacktrace: {
              frames: [
                { filename: "https://frostbit.example/_next/static/c.js?v=9" },
              ],
            },
          },
        ],
      },
      keep,
    );
    expect(scrubbed).toMatchObject({
      $current_url: "https://frostbit.example/s/:id",
      $referrer: "https://elsewhere.example/page",
    });
    expect(JSON.stringify(scrubbed)).not.toContain("SECRET");
    expect(JSON.stringify(scrubbed)).not.toContain("v=9");
  });

  it("leaves a file path that is not an address as it is, so a server frame stays readable", () => {
    const scrubbed = scrubPostHogRecord(
      {
        frames: [
          { filename: "node:internal/process/task_queues" },
          { filename: "/srv/app/server.js" },
        ],
      },
      keep,
    );
    expect(scrubbed).toEqual({
      frames: [
        { filename: "node:internal/process/task_queues" },
        { filename: "/srv/app/server.js" },
      ],
    });
  });

  it("keeps the ids the platform made itself, which scrubbing would otherwise remove", () => {
    expect(
      scrubPostHogRecord(
        { correlation_id: uuid, operation_id: "games.get", route: "/s/:id" },
        keep,
      ),
    ).toEqual({
      correlation_id: uuid,
      operation_id: "games.get",
      route: "/s/:id",
    });
  });

  it("takes the lines of source code the Node library adds out of every frame, when asked", () => {
    const withContext = {
      $exception_list: [
        {
          stacktrace: {
            frames: [
              {
                context_line: "const key = 'x';",
                function: "f",
                post_context: ["a"],
                pre_context: ["b"],
              },
            ],
          },
        },
      ],
    };
    const dropped = scrubPostHogRecord(withContext, {
      dropSourceContext: true,
    });
    expect(JSON.stringify(dropped)).not.toMatch(/context/u);
    expect(JSON.stringify(dropped)).toContain('"function":"f"');
    expect(JSON.stringify(scrubPostHogRecord(withContext, keep))).toContain(
      "context_line",
    );
  });
});

describe("the page's own path", () => {
  it("is made anonymous the way the address is", () => {
    expect(
      JSON.stringify(
        scrubPostHogRecord(
          { $pathname: `/s/${uuid}`, $host: "frostbit.example" },
          keep,
        ),
      ),
    ).toBe('{"$pathname":"/s/:id","$host":"frostbit.example"}');
  });
});
