// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { AnalyticsProvider } from "@frostbite/client-react";
import { SignInSurface } from "../src/sign-in/sign-in-surface.tsx";
import type { SignInView } from "../src/sign-in/views.ts";

let container: HTMLElement;
let root: Root;
const navigate = vi.fn();

// A view that signs in when its button is pressed, as the real ones do once the server has said so.
const view = (kind: string, label: string): SignInView => ({
  Component: ({ expectedNetwork, onSignedIn, track }) => (
    <>
      <button data-network={expectedNetwork} onClick={onSignedIn} type="button">
        {`Sign in via ${kind}`}
      </button>
      <button onClick={track.started} type="button">
        {`Begin ${kind}`}
      </button>
      <button onClick={() => track.failed("code-wrong")} type="button">
        {`Fail ${kind}`}
      </button>
    </>
  ),
  glyph: "*",
  kind,
  label,
  tagline: `${label} tagline`,
});
const views = [
  view("wallet", "Wallet"),
  view("passkey", "Passkey"),
  view("email", "Email"),
];

const capture = vi.fn();
const analytics = { capture, shutdown: () => Promise.resolve() };

const show = (offered: readonly string[]) =>
  act(async () => {
    root.render(
      <AnalyticsProvider analytics={analytics}>
        <SignInSurface
          expectedNetwork="signet"
          navigate={navigate}
          offered={offered}
          views={views}
        />
      </AnalyticsProvider>,
    );
  });

beforeAll(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
});
beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  navigate.mockClear();
  capture.mockClear();
  window.history.replaceState(null, "", "/sign-in");
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const keys = () => [
  ...container.querySelectorAll<HTMLButtonElement>("[role=tab]"),
];
const visiblePanels = () =>
  [...container.querySelectorAll("[role=tabpanel]:not([hidden]) h2")].map(
    (heading) => heading.textContent,
  );
const press = (name: string) =>
  act(async () => {
    [...container.querySelectorAll("button")]
      .find((candidate) => candidate.textContent === name)
      ?.click();
  });

describe("the sign-in page's methods", () => {
  it("shows a key for each offered method, in the server's order, with the network the wallet is asked for", async () => {
    await show(["email", "wallet"]);
    expect(
      keys().map(
        (key) => key.querySelector(".sign-in-key__label")?.textContent,
      ),
    ).toEqual(["Email", "Wallet"]);
    expect(keys()[0]?.querySelector("small")?.textContent).toBe(
      "Email tagline",
    );
    expect(
      container.querySelector("[data-network]")?.getAttribute("data-network"),
    ).toBe("signet");
  });

  it("opens the first method and shows only the chosen one's panel, naming it", async () => {
    await show(["wallet", "passkey", "email"]);
    expect(keys().map((key) => key.ariaSelected)).toEqual([
      "true",
      "false",
      "false",
    ]);
    expect(visiblePanels()).toEqual(["Wallet login"]);
    await act(async () => keys()[2]?.click());
    expect(visiblePanels()).toEqual(["Email login"]);
    expect(keys().map((key) => key.ariaSelected)).toEqual([
      "false",
      "false",
      "true",
    ]);
    // Each panel is named by its key, and each key points at its panel.
    const panel = container.querySelector<HTMLElement>(
      "[role=tabpanel]:not([hidden])",
    );
    expect(keys()[2]?.getAttribute("aria-controls")).toBe(panel?.id);
    // It is named by the key's name alone, not by the line under it, which would also make it answer to "code" or "wallet".
    expect(
      document.getElementById(panel?.getAttribute("aria-labelledby") ?? "")
        ?.textContent,
    ).toBe("Email");
  });

  it("keeps the other panels in the page, so a method that is not shown still works", async () => {
    await show(["wallet", "email"]);
    expect(container.querySelectorAll("[role=tabpanel]")).toHaveLength(2);
    // The hidden one's button is there to act (as when it finds the person already signed in), not removed.
    await press("Sign in via email");
    expect(navigate).toHaveBeenCalledExactlyOnceWith("/");
  });

  it("moves between the keys with the arrow keys, wrapping, and to the ends with Home and End", async () => {
    await show(["wallet", "passkey", "email"]);
    // The keys' own movement must not also scroll the page, so a handled key is cancelled and any other is left alone.
    const cancelled: boolean[] = [];
    const keyDown = (key: string) =>
      act(async () => {
        const event = new KeyboardEvent("keydown", {
          bubbles: true,
          cancelable: true,
          key,
        });
        container
          .querySelector("[role=tab][aria-selected=true]")
          ?.dispatchEvent(event);
        cancelled.push(event.defaultPrevented);
      });
    await keyDown("ArrowLeft");
    expect(visiblePanels()).toEqual(["Email login"]);
    expect(document.activeElement).toBe(keys()[2]);
    await keyDown("ArrowRight");
    expect(visiblePanels()).toEqual(["Wallet login"]);
    await keyDown("End");
    expect(visiblePanels()).toEqual(["Email login"]);
    await keyDown("Home");
    expect(visiblePanels()).toEqual(["Wallet login"]);
    // Only the chosen key is in the tab order.
    expect(keys().map((key) => key.tabIndex)).toEqual([0, -1, -1]);
    await keyDown("a");
    expect(visiblePanels()).toEqual(["Wallet login"]);
    expect(cancelled).toEqual([true, true, true, true, false]);
  });

  it("says so, instead of showing an empty page, when nothing can be offered", async () => {
    await show([]);
    expect(container.textContent).toContain(
      "Signing in is not available right now.",
    );
    await show(["phone"]);
    expect(container.textContent).toContain(
      "Signing in is not available right now.",
    );
  });

  it("goes back to the page the visitor came for once a method says they are signed in", async () => {
    window.history.replaceState(null, "", "/sign-in?returnTo=%2Fadmin%2Fgames");
    await show(["wallet"]);
    await press("Sign in via wallet");
    expect(navigate).toHaveBeenCalledExactlyOnceWith("/admin/games");
  });

  it("goes home when there is nowhere in particular to go", async () => {
    await show(["wallet"]);
    await press("Sign in via wallet");
    expect(navigate).toHaveBeenCalledExactlyOnceWith("/");
  });

  it("never goes to another site, whatever the address asks for", async () => {
    for (const bad of [
      "https%3A%2F%2Fevil.example",
      "%2F%2Fevil.example",
      "javascript%3Aalert(1)",
      "%2Fsign-in",
    ]) {
      navigate.mockClear();
      window.history.replaceState(null, "", `/sign-in?returnTo=${bad}`);
      await show(["wallet"]);
      await press("Sign in via wallet");
      expect(navigate).toHaveBeenCalledExactlyOnceWith("/");
    }
  });
});

describe("what the sign-in page counts", () => {
  it("counts a sign-in as begun by a method, as failed with its reason code, and as succeeded only when begun", async () => {
    await show(["wallet", "passkey"]);
    await press("Begin wallet");
    await press("Fail wallet");
    await press("Sign in via wallet");
    expect(capture.mock.calls).toEqual([
      ["sign_in_started", { method: "wallet" }],
      ["sign_in_failed", { method: "wallet", reason: "code-wrong" }],
      ["sign_in_succeeded", { method: "wallet" }],
    ]);
  });

  it("does not count a success for a method the person never began, such as one that found them already signed in", async () => {
    await show(["wallet", "passkey"]);
    await press("Begin passkey");
    await press("Sign in via wallet");
    expect(capture.mock.calls.map(([name]) => name)).toEqual([
      "sign_in_started",
    ]);
    expect(navigate).toHaveBeenCalledTimes(1);
  });
});
