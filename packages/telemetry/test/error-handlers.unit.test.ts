import { describe, expect, it, vi } from "vitest";

import {
  createBrowserErrorReporter,
  installGlobalErrorHandlers,
  type ErrorSource,
} from "../src/errors/browser.ts";
import type { ErrorReporter } from "../src/errors/port.ts";
import {
  createServerErrorReporter,
  installProcessErrorMonitor,
} from "../src/errors/server.ts";

const noop = { ingestOrigin: null, provider: "noop", token: null };

function windowLike() {
  const listeners = new Map<string, (event: never) => void>();
  const source = {
    addEventListener: (type: string, listener: (event: never) => void) => {
      listeners.set(type, listener);
    },
    removeEventListener: (type: string) => {
      listeners.delete(type);
    },
  } as unknown as ErrorSource;
  return { listeners, source };
}
function reporter() {
  return {
    captureException: vi.fn<ErrorReporter["captureException"]>(),
    shutdown: vi.fn(() => Promise.resolve()),
  };
}

describe("the handlers for what a page does not catch", () => {
  it("report an uncaught error and an unhandled rejection, through the reporter, with the page as a template and no query", () => {
    const { listeners, source } = windowLike();
    const reports: { message: string; route?: string }[] = [];
    const reporter = createBrowserErrorReporter(
      { ingestOrigin: null, provider: "fake", token: "k" },
      {
        registry: {
          fake: () => ({
            captureException: (report) => {
              reports.push({
                message: report.message,
                route: report.context.route,
              });
            },
            shutdown: () => Promise.resolve(),
          }),
        },
      },
    );
    installGlobalErrorHandlers(reporter, source, () => "/s/12345?code=SECRET");
    listeners.get("error")?.({
      error: new Error("uncaught for a@b.co"),
    } as never);
    listeners.get("unhandledrejection")?.({
      reason: new Error("rejected"),
    } as never);
    expect(reports).toEqual([
      { message: "uncaught for [removed]", route: "/s/:id" },
      { message: "rejected", route: "/s/:id" },
    ]);
  });

  it("can be taken away", () => {
    const { listeners, source } = windowLike();
    const remove = installGlobalErrorHandlers(reporter(), source, () => "/");
    expect(listeners.size).toBe(2);
    remove();
    expect(listeners.size).toBe(0);
  });
});

describe("the monitor for what ends a process", () => {
  it("reports the error that is about to end it, and starts closing the reporter", () => {
    let heard: ((error: unknown) => void) | undefined;
    const seen = reporter();
    installProcessErrorMonitor(seen, {
      on: (_event, listener) => {
        heard = listener;
      },
    });
    const failure = new Error("fatal");
    heard?.(failure);
    expect(seen.captureException).toHaveBeenCalledWith(failure);
    expect(seen.shutdown).toHaveBeenCalledOnce();
  });
});

describe("the reporters for each runtime", () => {
  it("run as noop for a page and for the server when no provider is set", async () => {
    await expect(
      createBrowserErrorReporter(noop).shutdown(),
    ).resolves.toBeUndefined();
    await expect(
      createServerErrorReporter(noop).shutdown(),
    ).resolves.toBeUndefined();
  });

  it("leave the message out of a server report and keep it, scrubbed, in a page's", () => {
    const sent: string[] = [];
    const registry = {
      fake: () => ({
        captureException: (report: { message: string }) => {
          sent.push(report.message);
        },
        shutdown: () => Promise.resolve(),
      }),
    };
    const fake = { ingestOrigin: null, provider: "fake", token: "k" };
    createServerErrorReporter(fake, { registry }).captureException(
      new Error("for a@b.co"),
    );
    createBrowserErrorReporter(fake, { registry }).captureException(
      new Error("for a@b.co"),
    );
    expect(sent).toEqual(["", "for [removed]"]);
  });

  it("refuse a provider name they do not have", () => {
    expect(() =>
      createServerErrorReporter({ ...noop, provider: "elsewhere" }),
    ).toThrow(/Unknown error-reporting provider/u);
  });
});
