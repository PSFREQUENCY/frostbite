// @vitest-environment jsdom

import { click, mount, textOf } from "@frostbite/test-kit/dom";
import { describe, expect, it, vi } from "vitest";

import { mintsCopy } from "../src/domain/mints-copy.ts";
import { MintsTab, mintsDockSection } from "../src/ui/mints-tab.tsx";
import { claimAt, milestoneId } from "./support/claims-ui.tsx";

const switchButtons = (container: HTMLElement) => [
  ...container.querySelectorAll<HTMLButtonElement>(".mints-tab__switch button"),
];

describe("the Mints tab", () => {
  it("starts on the player's own claims, and the switch shows the game's public mints and back", async () => {
    const container = await mount(
      <MintsTab everyone={<p>public mints</p>} mine={<p>my claims</p>} />,
    );
    expect(
      switchButtons(container).map(({ textContent }) => textContent),
    ).toEqual([mintsCopy.mine, mintsCopy.everyone]);
    expect(textOf(container)).toContain("my claims");
    expect(textOf(container)).not.toContain("public mints");
    const [mine, everyone] = switchButtons(container);
    expect(mine?.getAttribute("aria-pressed")).toBe("true");
    await click(everyone as HTMLElement);
    expect(textOf(container)).toContain("public mints");
    expect(textOf(container)).not.toContain("my claims");
    expect(everyone?.getAttribute("aria-pressed")).toBe("true");
    await click(mine as HTMLElement);
    expect(textOf(container)).toContain("my claims");
  });

  it("has no switch when there is only one thing to show, and shows that one", async () => {
    const onlyPublic = await mount(<MintsTab everyone={<p>public mints</p>} />);
    expect(switchButtons(onlyPublic)).toHaveLength(0);
    expect(textOf(onlyPublic)).toContain("public mints");
    const onlyMine = await mount(<MintsTab mine={<p>my claims</p>} />);
    expect(switchButtons(onlyMine)).toHaveLength(0);
    expect(textOf(onlyMine)).toContain("my claims");
  });
});

describe("the player's claims in it", () => {
  const section = (claims: ReturnType<typeof claimAt>[], onReview = vi.fn()) =>
    mintsDockSection({
      claims,
      everyone: undefined,
      onReview,
      titles: { [milestoneId]: "First win" },
    });

  it("are short rows with the name and where each stands, a Details button, and no picture; the badge counts them", async () => {
    const onReview = vi.fn();
    const dock = section([claimAt("complete")], onReview);
    expect(dock.label).toBe(mintsCopy.title);
    expect(dock.id).toBe("mints");
    expect(dock.badge).toBe("1");
    const container = await mount(<>{dock.content}</>);
    const row = container.querySelector(".mints-list li");
    expect(textOf(row as HTMLElement)).toContain("First win");
    expect(textOf(row as HTMLElement)).toContain("Claimed");
    expect(container.querySelector("img")).toBeNull();
    await click(container.querySelector("button") as HTMLElement);
    expect(onReview).toHaveBeenCalledOnce();
  });

  it("say nothing was claimed when nothing was, and have no badge", async () => {
    const dock = section([]);
    expect(dock.badge).toBeNull();
    const container = await mount(<>{dock.content}</>);
    expect(textOf(container)).toContain(
      "You have not claimed anything from this game.",
    );
  });
});
