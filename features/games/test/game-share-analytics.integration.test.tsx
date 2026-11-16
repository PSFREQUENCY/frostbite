// @vitest-environment jsdom

import { AnalyticsProvider } from "@frostbite/client-react";
import { defineShareConfig } from "@frostbite/share";
import {
  click,
  installDialogShim,
  mount,
  settle,
} from "@frostbite/test-kit/dom";
import { beforeAll, describe, expect, it, vi } from "vitest";

import type { SharesApi } from "../src/client/shares-api.ts";
import { ShareControl } from "../src/ui/share-control.tsx";

const config = defineShareConfig({
  hashtags: [],
  platforms: [
    {
      accent: "#000000",
      id: "x",
      label: "X",
      mark: "X",
      template: "https://x.example/post?text={text}&url={url}",
    },
  ],
});
const api: SharesApi = {
  create: vi.fn(async () => ({
    id: "x",
    path: "/s/x",
    status: "shared" as const,
  })),
};
const request = { gameId: "embedded-game", kind: "score", score: 250 } as const;

beforeAll(installDialogShim);

describe("what the share control counts", () => {
  it("counts the platform a person chose, and not the link, the score or the player", async () => {
    const capture = vi.fn();
    const container = await mount(
      <AnalyticsProvider
        analytics={{ capture, shutdown: async () => undefined }}
      >
        <ShareControl
          api={api}
          config={config}
          heading="A score"
          kicker="New best"
          request={request}
          text="Look"
        />
      </AnalyticsProvider>,
    );
    click(container.querySelector(".share-trigger"));
    await settle(() =>
      expect(container.querySelector("a.share-tile")).not.toBeNull(),
    );
    expect(capture).not.toHaveBeenCalled();
    const tile = container.querySelector("a.share-tile");
    tile?.addEventListener("click", (event) => event.preventDefault());
    click(tile);
    expect(capture.mock.calls).toEqual([["share_clicked", { platform: "x" }]]);
  });

  it("shares just the same where nothing is counting", async () => {
    const container = await mount(
      <ShareControl
        api={api}
        config={config}
        heading="A score"
        kicker="New best"
        request={request}
        text="Look"
      />,
    );
    click(container.querySelector(".share-trigger"));
    await settle(() =>
      expect(container.querySelector("a.share-tile")).not.toBeNull(),
    );
    const tile = container.querySelector("a.share-tile");
    tile?.addEventListener("click", (event) => event.preventDefault());
    expect(() => click(tile)).not.toThrow();
  });
});
