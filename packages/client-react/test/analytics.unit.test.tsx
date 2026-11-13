import type { Analytics } from "@frostbite/telemetry/analytics";
import { mount } from "@frostbite/test-kit/dom";
import { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";

import { AnalyticsProvider, useAnalytics } from "../src/analytics.tsx";

function Counts({ game }: { readonly game: string }) {
  useAnalytics().capture("game_opened", { game });
  return null;
}

describe("the analytics a component asks for", () => {
  it("is the page's own when a provider is above it", async () => {
    const capture = vi.fn();
    const analytics: Analytics = { capture, shutdown: () => Promise.resolve() };
    await mount(
      <AnalyticsProvider analytics={analytics}>
        <Counts game="permafrost" />
      </AnalyticsProvider>,
    );
    expect(capture).toHaveBeenCalledWith("game_opened", {
      game: "permafrost",
    });
  });

  it("counts nothing, and does not fail, when there is no provider", async () => {
    let found: Analytics | undefined;
    function Reads({ onRead }: { readonly onRead: (a: Analytics) => void }) {
      const analytics = useAnalytics();
      useEffect(() => {
        onRead(analytics);
      }, [analytics, onRead]);
      return null;
    }
    await mount(<Counts game="permafrost" />);
    await mount(
      <Reads
        onRead={(analytics) => {
          found = analytics;
        }}
      />,
    );
    await expect(found?.shutdown()).resolves.toBeUndefined();
  });
});
