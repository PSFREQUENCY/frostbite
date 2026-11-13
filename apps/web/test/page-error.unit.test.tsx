// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const reported = vi.fn();
vi.mock("../src/telemetry/browser-reporter", () => ({
  browserErrorReporter: () => ({ captureException: reported }),
}));

import PageError from "../src/app/error";

let root: Root | null = null;
afterEach(async () => {
  await act(() => root?.unmount());
  document.body.innerHTML = "";
  reported.mockReset();
});

async function show(error: Error, reset = vi.fn()) {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(() => root?.render(<PageError error={error} reset={reset} />));
  return { container, reset };
}

describe("the page that shows when a page breaks", () => {
  it("says so in the platform's own words, with a way to try again that calls reset", async () => {
    const { container, reset } = await show(new Error("render failed"));
    expect(container.textContent).toContain("This page hit a snag");
    const button = [...container.querySelectorAll("button")].find(
      (b) => b.textContent === "Try again",
    );
    await act(() => button?.click());
    expect(reset).toHaveBeenCalledOnce();
  });

  it("reports the error once, with the page it was on, and does not show it", async () => {
    const failure = new Error("secret detail a@b.co");
    const { container } = await show(failure);
    expect(reported).toHaveBeenCalledExactlyOnceWith(failure, {
      route: window.location.pathname,
    });
    expect(container.textContent).not.toContain("secret detail");
  });
});
