import { describe, expect, it } from "vitest";

import { analyticsEvents, checkEvent } from "../src/analytics/catalogue.ts";

// One valid example of every event. A new event without an example here fails the first test, so none is added unchecked.
export const examples: Readonly<Record<string, Record<string, unknown>>> = {
  game_opened: { game: "pocket-dragon" },
  leaderboard_viewed: { game: "permafrost", window: "week" },
  milestone_claim_failed: { game: "permafrost", reason: "wallet_rejected" },
  milestone_claim_started: { game: "permafrost" },
  milestone_claim_succeeded: { game: "permafrost" },
  run_finished: { game: "permafrost", verified: true },
  run_started: { game: "permafrost" },
  share_clicked: { platform: "x" },
  sign_in_failed: { method: "wallet", reason: "signature.invalid" },
  sign_in_started: { method: "email" },
  sign_in_succeeded: { method: "passkey" },
  wallet_connect_failed: { reason: "not_installed", wallet: "xverse" },
  wallet_connect_started: { wallet: "unisat" },
  wallet_connect_succeeded: { wallet: "oyl" },
};

describe("the analytics catalogue", () => {
  it("has a valid example for every event and no example for an event that is not in it", () => {
    expect(Object.keys(examples).sort()).toEqual(
      Object.keys(analyticsEvents).sort(),
    );
    for (const [name, properties] of Object.entries(examples))
      expect(checkEvent(name, properties)).toEqual(properties);
  });

  it("drops an event that is not in the list", () => {
    expect(checkEvent("page_scrolled", {})).toBeNull();
    expect(checkEvent("constructor", {})).toBeNull();
    expect(checkEvent("toString", {})).toBeNull();
  });

  it("drops an event carrying a property it does not allow, so nothing rides along", () => {
    expect(
      checkEvent("run_started", { address: "bc1q…", game: "permafrost" }),
    ).toBeNull();
    expect(
      checkEvent("sign_in_started", { email: "a@b.co", method: "email" }),
    ).toBeNull();
  });

  it("drops an event missing a property or holding one of the wrong kind", () => {
    expect(checkEvent("run_finished", { game: "permafrost" })).toBeNull();
    expect(
      checkEvent("run_finished", { game: "permafrost", verified: "yes" }),
    ).toBeNull();
    expect(checkEvent("run_started", { game: 7 })).toBeNull();
    expect(checkEvent("run_started", null)).toBeNull();
  });

  it("drops a name that is not a short name the platform would choose", () => {
    expect(checkEvent("game_opened", { game: "Pocket Dragon!" })).toBeNull();
    expect(checkEvent("game_opened", { game: "a".repeat(65) })).toBeNull();
    expect(
      checkEvent("sign_in_failed", {
        method: "wallet",
        reason: "Because it broke",
      }),
    ).toBeNull();
  });
});
