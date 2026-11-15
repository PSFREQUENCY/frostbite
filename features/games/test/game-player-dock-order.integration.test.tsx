// @vitest-environment jsdom

import { describe, expect, it } from "vitest";

import {
  harness as h,
  mount,
  registerHarness,
} from "./support/player-harness.tsx";
import { claimGame, fakeApi, wallet } from "./support/claims-ui.tsx";

registerHarness();

const labels = () =>
  [...h.container.querySelectorAll(".arcade-dock__strip button")].map(
    (button) => button.textContent.replace(/\d+(\/\d+)?$/u, ""),
  );
const section = (id: string, label: string) => ({
  badge: null,
  content: <p>{label}</p>,
  id,
  label,
});

describe("the order of a game's dock", () => {
  it("puts the leaderboard right after the milestones, then the mints, then the rest, so a phone reaches them without scrolling the strip", async () => {
    await mount(undefined, {
      claims: { api: fakeApi(), wallet },
      game: claimGame,
      gallery: <p>public mints</p>,
      lead: [section("leaderboard", "Leaderboard")],
      sections: [
        section("about", "About"),
        section("asks", "What it asks for"),
      ],
    });
    expect(labels()).toEqual([
      "Milestones",
      "Leaderboard",
      "Mints",
      "About",
      "What it asks for",
    ]);
  });

  it("has one Mints tab, however many things are in it: no separate Claims or Minted tab", async () => {
    await mount(undefined, {
      claims: { api: fakeApi(), wallet },
      game: claimGame,
      gallery: <p>public mints</p>,
    });
    expect(labels().filter((label) => /claim|mint/iu.test(label))).toEqual([
      "Mints",
    ]);
  });

  it("has a Mints tab for a game whose mints can be seen but not claimed here, and none for a game that mints nothing", async () => {
    await mount(undefined, { gallery: <p>public mints</p> });
    expect(labels()).toContain("Mints");
    await mount(undefined, {});
    expect(labels()).not.toContain("Mints");
  });
});
