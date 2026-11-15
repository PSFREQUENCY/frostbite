// @vitest-environment jsdom

import { act } from "react";
import { describe, expect, it, vi } from "vitest";

import {
  flush,
  harness as h,
  registerHarness,
} from "./support/player-harness.tsx";
import {
  claimUnavailableCopy,
  unreachableCopy,
} from "../src/domain/claim-copy.ts";
import { claimAt, earned, fakeApi, wallet } from "./support/claims-ui.tsx";

registerHarness();

const button = (name: string) =>
  [...h.container.querySelectorAll("button")].find((candidate) =>
    candidate.textContent.includes(name),
  );
const click = (name: string) =>
  act(async () => {
    button(name)?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
const dialog = () =>
  h.container.querySelector<HTMLDialogElement>("dialog.arcade-modal");

// A claim the platform has not answered yet, and the way to answer it.
function slowStart() {
  let answer: (
    value: Awaited<ReturnType<ReturnType<typeof fakeApi>["start"]>>,
  ) => void = () => undefined;
  const start = vi.fn(
    () =>
      new Promise<Awaited<ReturnType<ReturnType<typeof fakeApi>["start"]>>>(
        (resolve) => {
          answer = resolve;
        },
      ),
  );
  return {
    answer: (value: Parameters<typeof answer>[0]) => answer(value),
    start,
  };
}

describe("while a claim is being made ready", () => {
  it("opens the dialog at once with what is happening, and the button says so and cannot be pressed again", async () => {
    const slow = slowStart();
    await earned({ api: fakeApi({ start: slow.start }), wallet });
    await click("Claim ");
    await flush();
    // Nothing has come back from the platform, and the player already has something to look at.
    expect(dialog()?.hasAttribute("open")).toBe(true);
    expect(
      dialog()?.querySelector('[data-testid="claim-preparing"]')?.textContent,
    ).toContain("Preparing your claim");
    expect(dialog()?.querySelector('[data-testid="claim-review"]')).toBeNull();
    expect(dialog()?.querySelector(".spinner")).not.toBeNull();
    const busy = [...h.container.querySelectorAll("button")].filter(
      (candidate) => candidate.getAttribute("aria-busy") === "true",
    );
    expect(busy.map(({ textContent }) => textContent)).toEqual(["Preparing…"]);
    expect(busy[0]?.disabled).toBe(true);
    // The card's button cannot be pressed again while the claim is being made ready.
    busy[0]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await flush();
    expect(slow.start).toHaveBeenCalledTimes(1);
  });

  it("starts one claim when the button is pressed twice before the page has changed", async () => {
    const slow = slowStart();
    await earned({ api: fakeApi({ start: slow.start }), wallet });
    // Both presses arrive in the same moment: the button has not yet had time to turn itself off.
    await act(async () => {
      const claim = button("Claim ");
      claim?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      claim?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(slow.start).toHaveBeenCalledTimes(1);
  });

  it("becomes the claim review when the platform answers, with no second dialog", async () => {
    const slow = slowStart();
    await earned({ api: fakeApi({ start: slow.start }), wallet });
    await click("Claim ");
    await flush();
    await act(async () =>
      slow.answer({
        claim: claimAt("awaiting-signature"),
        resumed: false,
        status: "started",
      }),
    );
    await flush();
    expect(
      dialog()?.querySelector('[data-testid="claim-preparing"]'),
    ).toBeNull();
    expect(
      dialog()?.querySelector('[data-testid="claim-review"]'),
    ).not.toBeNull();
    expect(h.container.querySelectorAll("dialog.arcade-modal")).toHaveLength(1);
  });

  it("says why in the dialog it opened, and gives the button back, when the platform says no", async () => {
    const refused = slowStart();
    await earned({ api: fakeApi({ start: refused.start }), wallet });
    await click("Claim ");
    await flush();
    await act(async () =>
      refused.answer({ reason: "claims-paused", status: "unavailable" }),
    );
    await flush();
    // The dialog does not flash and close: the reason is what the player was waiting to see.
    expect(dialog()?.hasAttribute("open")).toBe(true);
    expect(
      dialog()?.querySelector('[data-testid="claim-preparing"]'),
    ).toBeNull();
    expect(dialog()?.querySelector('[role="alert"]')?.textContent).toBe(
      claimUnavailableCopy["claims-paused"],
    );
    expect(h.container.querySelector('[aria-busy="true"]')).toBeNull();
    expect(button("Claim ")?.disabled).toBe(false);
  });

  it("goes away with the dialog, and does not come back with the next claim", async () => {
    const refused = slowStart();
    await earned({ api: fakeApi({ start: refused.start }), wallet });
    await click("Claim ");
    await flush();
    await act(async () =>
      refused.answer({ reason: "claims-paused", status: "unavailable" }),
    );
    await flush();
    await click("Close");
    await flush();
    expect(dialog()?.hasAttribute("open")).toBe(false);
    expect(dialog()?.textContent).not.toContain(
      claimUnavailableCopy["claims-paused"],
    );
  });

  it("says so in the dialog when the request itself fails", async () => {
    await earned({
      api: fakeApi({
        start: vi.fn(async () => Promise.reject(new Error("down"))),
      }),
      wallet,
    });
    await click("Claim ");
    await flush();
    expect(dialog()?.hasAttribute("open")).toBe(true);
    expect(dialog()?.querySelector('[role="alert"]')?.textContent).toBe(
      unreachableCopy,
    );
    expect(button("Claim ")?.disabled).toBe(false);
  });
});
