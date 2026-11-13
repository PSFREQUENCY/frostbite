import { AnalyticsProvider } from "@frostbite/client-react";
import type { ShareConfig } from "@frostbite/share";
import {
  click,
  installDialogShim,
  mount,
  settle,
} from "@frostbite/test-kit/dom";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { ProfileShare } from "../src/ui/profile-share.tsx";

const config: ShareConfig = {
  hashtags: [],
  platforms: [
    {
      accent: "#000000",
      id: "x",
      label: "X",
      mark: "X",
      template: "https://x.example/?t={text}&u={url}",
    },
  ],
};

beforeAll(installDialogShim);

describe("what sharing a profile counts", () => {
  it("counts the platform chosen, and not the name on the page", async () => {
    const capture = vi.fn();
    const container = await mount(
      <AnalyticsProvider
        analytics={{ capture, shutdown: async () => undefined }}
      >
        <ProfileShare config={config} name="Ada" />
      </AnalyticsProvider>,
    );
    click(container.querySelector(".share-trigger"));
    await settle(() =>
      expect(container.querySelector("a.share-tile")).not.toBeNull(),
    );
    const tile = container.querySelector("a.share-tile");
    tile?.addEventListener("click", (event) => event.preventDefault());
    click(tile);
    expect(capture.mock.calls).toEqual([["share_clicked", { platform: "x" }]]);
    expect(JSON.stringify(capture.mock.calls)).not.toContain("Ada");
  });
});
