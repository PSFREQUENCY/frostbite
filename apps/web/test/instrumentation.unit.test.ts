import { afterEach, describe, expect, it, vi } from "vitest";

const checked = vi.fn<() => Promise<void>>();
vi.mock("@repo/configs/game-rewards", () => ({
  checkRewardsChainAtStartup: checked,
}));

const reporterMade = vi.fn();
vi.mock("../src/server/telemetry/reporter", () => ({
  serverErrorReporter: reporterMade,
}));
const requestErrorSeen = vi.fn();
vi.mock("../src/server/telemetry/request-error", () => ({
  reportRequestError: requestErrorSeen,
}));

import { onRequestError, register } from "../src/instrumentation.ts";

afterEach(() => {
  vi.unstubAllEnvs();
  checked.mockReset();
  reporterMade.mockReset();
  requestErrorSeen.mockReset();
});

describe("the server's start", () => {
  it("looks at the rewards chain's settings in the Node.js runtime, and stops where they cannot work", async () => {
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    checked.mockResolvedValueOnce();
    await expect(register()).resolves.toBeUndefined();
    expect(checked).toHaveBeenCalledTimes(1);
    checked.mockRejectedValueOnce(new Error("REWARDS_FEE_API_FORMAT is bad"));
    await expect(register()).rejects.toThrow("REWARDS_FEE_API_FORMAT is bad");
  });

  it.each(["edge", ""])(
    "does not look where the runtime is %j, which has no chain",
    async (runtime) => {
      vi.stubEnv("NEXT_RUNTIME", runtime);
      await register();
      expect(checked).not.toHaveBeenCalled();
    },
  );

  it("also makes the error reporter at start, so a provider that cannot work stops the server there", async () => {
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    checked.mockResolvedValue();
    await register();
    expect(reporterMade).toHaveBeenCalledOnce();
    reporterMade.mockImplementationOnce(() => {
      throw new Error("ERROR_REPORTING_INGEST_ORIGIN is missing");
    });
    await expect(register()).rejects.toThrow("ERROR_REPORTING_INGEST_ORIGIN");
  });
});

describe("the errors Next.js tells of", () => {
  const request = { headers: {}, method: "GET", path: "/games/permafrost?x=1" };
  const context = {
    renderSource: "react-server-components",
    renderType: "dynamic",
    revalidateReason: undefined,
    routePath: "/games/[slug]",
    routeType: "render",
    routerKind: "App Router",
  } as const;

  it("go to the reporter with the route, in the Node.js runtime", async () => {
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    const failure = new Error("render failed");
    await onRequestError(failure, request, context);
    expect(requestErrorSeen).toHaveBeenCalledExactlyOnceWith(failure, context);
  });

  it("are left alone where the runtime has no reporter", async () => {
    vi.stubEnv("NEXT_RUNTIME", "edge");
    await onRequestError(new Error("x"), request, context);
    expect(requestErrorSeen).not.toHaveBeenCalled();
  });
});
