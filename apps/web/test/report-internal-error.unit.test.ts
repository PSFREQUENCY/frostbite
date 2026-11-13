import { afterEach, describe, expect, it, vi } from "vitest";

const captured = vi.fn();
vi.mock("../src/server/telemetry/reporter", () => ({
  serverErrorReporter: () => ({ captureException: captured }),
}));

import { correlationIdSchema } from "@frostbite/shared/http";

import { reportInternalError } from "../src/server/http/report-internal-error";

afterEach(() => {
  captured.mockReset();
  vi.restoreAllMocks();
});

const base = {
  correlationId: correlationIdSchema.parse(
    "123e4567-e89b-42d3-a456-426614174000",
  ),
  operationId: "syncGameState",
};

describe("telling the error provider of an internal error", () => {
  it("writes the log line first and sends the exception with the ids that find it", () => {
    const written = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const failure = new Error("boom");
    reportInternalError({ ...base, error: failure, kind: "exception" });
    expect(written).toHaveBeenCalledOnce();
    expect(captured).toHaveBeenCalledExactlyOnceWith(failure, {
      correlationId: base.correlationId,
      operationId: "syncGameState",
    });
  });

  it("names an answer the operation's declaration does not allow, by its class and its application code, with no message to carry anything", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    reportInternalError({
      ...base,
      code: "not_found",
      kind: "undeclared-error",
    });
    reportInternalError({ ...base, kind: "invalid-output" });
    const [undeclared, invalid] = captured.mock.calls.map(
      ([error]) => error as Error & { code?: string },
    );
    expect(undeclared).toMatchObject({
      code: "not_found",
      name: "UndeclaredHttpError",
    });
    expect(invalid?.name).toBe("InvalidOutputHttpError");
  });

  it("never lets the reporter stop the log or fail the request", () => {
    const written = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    captured.mockImplementation(() => {
      throw new Error("down");
    });
    expect(() => {
      reportInternalError({ ...base, kind: "invalid-output" });
    }).not.toThrow();
    expect(written).toHaveBeenCalledOnce();
  });
});
