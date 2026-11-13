// @vitest-environment jsdom
import { useAnalytics } from "@frostbite/client-react";
import { mount } from "@frostbite/test-kit/dom";
import { describe, expect, it, vi } from "vitest";

const captured = vi.hoisted(() => vi.fn());
vi.mock("../src/telemetry/browser-analytics", () => ({
  pageAnalytics: { capture: captured, shutdown: () => Promise.resolve() },
}));

import { AnalyticsBoundary } from "../src/telemetry/analytics-boundary";

function Counts() {
  useAnalytics().capture("game_opened", { game: "permafrost" });
  return <p>shown</p>;
}

describe("the boundary that gives a page its analytics", () => {
  it("shows what is inside it, and lets it count through the page's analytics", async () => {
    const container = await mount(
      <AnalyticsBoundary>
        <Counts />
      </AnalyticsBoundary>,
    );
    expect(container.textContent).toBe("shown");
    expect(captured).toHaveBeenCalledExactlyOnceWith("game_opened", {
      game: "permafrost",
    });
  });
});
