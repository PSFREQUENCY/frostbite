// @vitest-environment jsdom
import { AnalyticsProvider } from "@frostbite/client-react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { SignInSurface } from "../src/sign-in/sign-in-surface.tsx";
import type { SignInView } from "../src/sign-in/views.ts";

// The invitation code on the sign-in page: it starts from the address, may be typed, and only a code of the right shape goes on to the methods.
let container: HTMLElement;
let root: Root;
const analytics = {
  capture: () => undefined,
  shutdown: () => Promise.resolve(),
};

// A method that shows the code it was given, so what reaches the methods can be read.
const views: SignInView[] = ["wallet", "email"].map((kind) => ({
  Component: ({ referralCode }) => (
    <span data-referral={referralCode ?? ""}>{kind}</span>
  ),
  glyph: "*",
  kind,
  label: kind,
  tagline: kind,
}));

const show = (referralCode: string | null = null, acceptsInvitation = true) =>
  act(async () => {
    root.render(
      <AnalyticsProvider analytics={analytics}>
        <SignInSurface
          acceptsInvitation={acceptsInvitation}
          expectedNetwork="signet"
          offered={["wallet", "email"]}
          referralCode={referralCode}
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
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("the invitation code", () => {
  const codes = () =>
    [...container.querySelectorAll("[data-referral]")].map((element) =>
      element.getAttribute("data-referral"),
    );
  const field = () =>
    container.querySelector<HTMLInputElement>(
      "details input[type=text], details input:not([type])",
    );
  const typeInto = (value: string) =>
    act(async () => {
      const input = field();
      if (input === null) throw new Error("no field");
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )?.set?.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });

  it("starts with the code the address carried, open, and hands it to every method", async () => {
    await show("23456789");
    expect(field()?.value).toBe("23456789");
    expect(container.querySelector("details")?.open).toBe(true);
    expect(codes()).toEqual(["23456789", "23456789"]);
  });

  it("is closed and empty when nobody sent the visitor, and hands on no code", async () => {
    await show();
    expect(container.querySelector("details")?.open).toBe(false);
    expect(codes()).toEqual(["", ""]);
  });

  it("takes a code typed in any case and with spaces, and hands the code on in its one form", async () => {
    await show();
    await typeInto(" bcdfghjk ");
    expect(codes()).toEqual(["BCDFGHJK", "BCDFGHJK"]);
    expect(container.querySelector("[role=alert]")).toBeNull();
  });

  it("says what is wrong with a text that is not a code, and hands on none", async () => {
    await show("23456789");
    await typeInto("nope");
    expect(codes()).toEqual(["", ""]);
    expect(container.textContent).toContain("8 letters and numbers");
    await typeInto("");
    expect(container.textContent).not.toContain("8 letters and numbers");
  });

  it("is not asked for where the page does not take invitations, whatever the address carried", async () => {
    await show("23456789", false);
    expect(container.querySelector("details")).toBeNull();
    expect(codes()).toEqual(["", ""]);
  });
});
