import { describe, expect, it, vi } from "vitest";

import { describeError, maxStackFrames } from "../src/errors/describe.ts";
import { createErrorReporter } from "../src/errors/index.ts";
import type { ErrorProvider } from "../src/errors/port.ts";
import type { Problem } from "../src/guard.ts";

const settings = {
  ingestOrigin: null,
  provider: "fake",
  token: "token",
} as const;
const uuid = "3f2a9c1e-5b7d-4e8a-9c0d-1a2b3c4d5e6f";

describe("describeError", () => {
  it("keeps only the top frames asked for", () => {
    const error = new Error("m");
    error.stack = Array.from(
      { length: 20 },
      (_, i) => `    at f${String(i)} (x:1:1)`,
    ).join("\n");
    expect(describeError(error, {}, { maxFrames: 3 }).frames).toHaveLength(3);
  });

  it("keeps the kind, the message and the lines of the stack", () => {
    const error = new TypeError("bad input");
    const report = describeError(error);
    expect(report.name).toBe("TypeError");
    expect(report.message).toBe("bad input");
    expect(report.frames.length).toBeGreaterThan(0);
    expect(report.frames.every((frame) => frame.startsWith("at "))).toBe(true);
  });

  it("removes private values from the message and the frames", () => {
    const error = new Error(`account ${uuid} for a@b.co failed`);
    error.stack = `Error: x\n    at run (/srv/${uuid}/file.js:1:1)`;
    const report = describeError(error);
    expect(report.message).toBe("account [removed] for [removed] failed");
    expect(report.frames).toEqual(["at run (/srv/[removed]/file.js:1:1)"]);
  });

  it("keeps only the top of a deep stack and cuts a long message", () => {
    const error = new Error("m".repeat(900));
    error.stack = Array.from(
      { length: 100 },
      (_, i) => `    at f${String(i)} (x:1:1)`,
    ).join("\n");
    const report = describeError(error);
    expect(report.frames).toHaveLength(maxStackFrames);
    expect(report.message).toHaveLength(500);
  });

  it("describes a thrown value that is not an Error without printing it", () => {
    const report = describeError({
      secret: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
    });
    expect(report).toMatchObject({ frames: [], name: "object" });
    expect(report.message).not.toContain("bc1q");
    expect(describeError("a string")).toMatchObject({
      message: "",
      name: "string",
    });
  });

  it("keeps the ids the platform made and the route as a template", () => {
    const report = describeError(new Error("x"), {
      correlationId: uuid,
      operationId: "games.getLeaderboard",
      release: "6c634184",
      route: `/s/${uuid}`,
    });
    expect(report.context).toEqual({
      correlationId: uuid,
      operationId: "games.getLeaderboard",
      release: "6c634184",
      route: "/s/:id",
    });
  });

  it("drops a context value that is not shaped like one of ours", () => {
    const report = describeError(new Error("x"), {
      correlationId: "has spaces and a@b.co",
      operationId: "x".repeat(200),
      release: "not a release!",
      route: "r".repeat(300),
    });
    expect(report.context).toEqual({});
  });
});

function reporterOn(provider: ErrorProvider) {
  const problems: Problem[] = [];
  const reporter = createErrorReporter(settings, {
    onProblem: (problem) => problems.push(problem),
    registry: { fake: () => provider },
    shutdownTimeoutMs: 10,
  });
  return { problems, reporter };
}

describe("the error reporter", () => {
  it("hands the provider a described, scrubbed report with the context", () => {
    const captureException = vi.fn<ErrorProvider["captureException"]>();
    const { reporter } = reporterOn({
      captureException,
      shutdown: () => Promise.resolve(),
    });
    reporter.captureException(new Error(`by ${uuid}`), {
      correlationId: "c-1",
    });
    expect(captureException).toHaveBeenCalledOnce();
    expect(captureException.mock.calls[0]?.[0]).toMatchObject({
      context: { correlationId: "c-1" },
      message: "by [removed]",
      name: "Error",
    });
  });

  it("contains a provider that throws or rejects, and one that will not close", async () => {
    const throwing = reporterOn({
      captureException: () => {
        throw new Error("down");
      },
      shutdown: () => Promise.resolve(),
    });
    expect(() => {
      throwing.reporter.captureException(new Error("x"));
    }).not.toThrow();
    expect(throwing.problems).toEqual(["provider-failed"]);
    const rejecting = reporterOn({
      captureException: () => Promise.reject(new Error("down")),
      shutdown: () => new Promise<void>(() => undefined),
    });
    rejecting.reporter.captureException(new Error("x"));
    await rejecting.reporter.shutdown();
    expect(rejecting.problems).toContain("provider-failed");
    expect(rejecting.problems).toContain("shutdown-timed-out");
  });

  it("refuses a provider name that is not in the registry", () => {
    expect(() =>
      createErrorReporter(
        { ...settings, provider: "elsewhere" },
        { registry: {} },
      ),
    ).toThrow(/Unknown error-reporting provider "elsewhere"/u);
  });

  it("leaves the message out of a report when told to, and keeps a database code", () => {
    const captureException = vi.fn<ErrorProvider["captureException"]>();
    const reporter = createErrorReporter(settings, {
      describe: { message: "omit" },
      registry: {
        fake: () => ({ captureException, shutdown: () => Promise.resolve() }),
      },
    });
    const failure = Object.assign(new Error("Failed query: params: a@b.co"), {
      name: "DrizzleQueryError",
    });
    reporter.captureException(
      Object.assign(failure, { cause: { code: "23505" } }),
    );
    const sent = captureException.mock.calls[0]?.[0];
    expect(sent).toMatchObject({
      code: "23505",
      message: "",
      name: "DrizzleQueryError",
    });
    expect(JSON.stringify(sent)).not.toContain("Failed query");
  });
});
