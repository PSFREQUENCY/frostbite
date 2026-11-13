import { afterEach, describe, expect, it, vi } from "vitest";

const captured = vi.fn();
vi.mock("../src/server/telemetry/reporter", () => ({
  serverErrorReporter: () => ({ captureException: captured }),
}));

import { reportRequestError } from "../src/server/telemetry/request-error";

afterEach(() => {
  captured.mockReset();
});

describe("telling the error provider of a request that failed", () => {
  it("sends the error with the route as a template, never the address that was asked for", () => {
    const failure = new Error("render failed");
    reportRequestError(failure, { routePath: "/games/[slug]" });
    expect(captured).toHaveBeenCalledExactlyOnceWith(failure, {
      route: "/games/[slug]",
    });
  });

  it("never throws, whatever the reporter does", () => {
    captured.mockImplementation(() => {
      throw new Error("down");
    });
    expect(() => {
      reportRequestError(new Error("x"), { routePath: "/" });
    }).not.toThrow();
  });
});
