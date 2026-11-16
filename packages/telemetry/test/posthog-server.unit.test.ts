import { describe, expect, it, vi } from "vitest";

import { describeError } from "../src/errors/describe.ts";
import {
  createPosthogServerErrors,
  posthogServerOptions,
  type PosthogServerDeps,
  serverDistinctId,
} from "../src/errors/providers/posthog-server.ts";

const settings = {
  ingestOrigin: "https://eu.i.example.com",
  provider: "posthog",
  token: "phc_test",
};

function client() {
  return {
    captureException:
      vi.fn<
        (
          error: Error,
          distinctId: string,
          properties: Record<string, unknown>,
        ) => void
      >(),
    shutdown: vi.fn<(timeoutMs?: number) => Promise<void>>(() =>
      Promise.resolve(),
    ),
  };
}

describe("the PostHog options for the server", () => {
  const options = posthogServerOptions("https://eu.i.example.com");

  it("send at once, to the address the setting names, with no location and no catching of its own", () => {
    expect(options).toMatchObject({
      disableGeoip: true,
      enableExceptionAutocapture: false,
      flushAt: 1,
      host: "https://eu.i.example.com",
    });
  });

  it("take the lines of our own source code out of every frame, and scrub the rest", () => {
    const before = options.before_send;
    const event = {
      distinctId: serverDistinctId,
      event: "$exception",
      properties: {
        $exception_list: [
          {
            stacktrace: {
              frames: [
                {
                  context_line: "const secret = 'x';",
                  function: "f",
                  pre_context: ["a"],
                },
              ],
            },
            value: "failed for a@b.co",
          },
        ],
      },
    };
    const result = (Array.isArray(before) ? before[0] : before)?.(event);
    expect(JSON.stringify(result)).not.toContain("context");
    expect(JSON.stringify(result)).not.toContain("a@b.co");
  });
});

describe("the PostHog error reporter on the server", () => {
  it("stops at start, naming the setting, when there is no address to send to", () => {
    expect(() =>
      createPosthogServerErrors({ ...settings, ingestOrigin: null }),
    ).toThrow(/ERROR_REPORTING_INGEST_ORIGIN/u);
  });

  it("makes its client from the project key and the options, and reports as one anonymous source with no person made", async () => {
    const made = client();
    const create = vi.fn<PosthogServerDeps["create"]>(() => made);
    const provider = createPosthogServerErrors(settings, { create });
    expect(create.mock.calls[0]?.[0]).toBe("phc_test");
    await provider.captureException(
      describeError(
        Object.assign(new Error("secret query"), { cause: { code: "23505" } }),
        { correlationId: "c-1", operationId: "games.get" },
        { message: "omit" },
      ),
    );
    const [error, distinctId, properties] =
      made.captureException.mock.calls[0] ?? [];
    expect((error as Error).message).toBe("");
    expect(distinctId).toBe(serverDistinctId);
    expect(properties).toEqual({
      $process_person_profile: false,
      correlation_id: "c-1",
      error_code: "23505",
      operation_id: "games.get",
    });
  });

  it("closes its client within a time", async () => {
    const made = client();
    const provider = createPosthogServerErrors(settings, {
      create: () => made,
    });
    await provider.shutdown();
    expect(made.shutdown).toHaveBeenCalledWith(2_000);
  });
});
