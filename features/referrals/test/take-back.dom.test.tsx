import {
  button,
  click,
  fieldByLabel,
  mount,
  settle,
  textOf,
  typeInto,
} from "@frostbite/test-kit/dom";
import { describe, expect, it, vi } from "vitest";

import { EarningRow } from "../src/ui/earning-row.tsx";
import { at, earningIn } from "./support/data.ts";
import { fakeApi } from "./support/fake-api.ts";

const row = (
  earning: ReturnType<typeof earningIn>,
  over: { mayTakeBack?: boolean; takeBack?: ReturnType<typeof vi.fn> } = {},
) =>
  mount(
    <ul>
      <EarningRow
        api={fakeApi(
          over.takeBack === undefined
            ? {}
            : { takeBack: over.takeBack as never },
        )}
        earning={earning}
        mayTakeBack={over.mayTakeBack ?? true}
      />
    </ul>,
  );
const open = async (container: HTMLElement) =>
  click(container.querySelector('button[aria-label="Take back +300 sats"]'));

describe("what an administrator is told before taking an earning back", () => {
  it.each([
    [
      "payable",
      "not in a payout yet",
      "Nothing was paid, so nothing is owed back",
    ],
    [
      "maturing",
      "not in a payout yet",
      "Nothing was paid, so nothing is owed back",
    ],
    [
      "in-payout",
      "inside a payout that has not finished",
      "still be sent as it is",
    ],
    ["paid", "already paid out", "cannot be taken from their wallet"],
  ] as const)(
    "for an earning that is %s, says what happens to the money, in plain words, before anything is sent",
    async (state, first, second) => {
      const takeBack = vi.fn();
      const container = await row(earningIn(state), { takeBack });
      expect(textOf(container)).not.toContain("Take back this earning?");
      await open(container);
      const text = textOf(container);
      expect(text).toContain("Take back this earning?");
      expect(text).toContain("it cannot be undone");
      expect(text).toContain(first);
      expect(text).toContain(second);
      expect(takeBack).not.toHaveBeenCalled();
    },
  );

  it("cannot be confirmed without a reason, and names the amount on the button", async () => {
    const container = await row(earningIn("payable"));
    await open(container);
    expect(button(container, "Take back 300 sats")?.disabled).toBe(true);
    await typeInto(
      fieldByLabel(container, "Why are you taking it back?"),
      "  Same wallet minting for itself  ",
    );
    expect(button(container, "Take back 300 sats")?.disabled).toBe(false);
  });

  it("can be walked away from: Keep it closes the form and sends nothing", async () => {
    const takeBack = vi.fn();
    const container = await row(earningIn("payable"), { takeBack });
    await open(container);
    await click(button(container, "Keep it"));
    expect(textOf(container)).not.toContain("Take back this earning?");
    expect(takeBack).not.toHaveBeenCalled();
  });
});

describe("taking it back", () => {
  it("sends the earning and the reason as typed (trimmed), then says in the past tense what happened to the money", async () => {
    const takeBack = vi.fn(async () => ({
      effect: "paid" as const,
      status: "saved" as const,
    }));
    const container = await row(earningIn("paid"), { takeBack });
    await open(container);
    await typeInto(
      fieldByLabel(container, "Why are you taking it back?"),
      "  Wash trading  ",
    );
    await click(button(container, "Take back 300 sats"));
    await settle(() => {
      expect(textOf(container)).toContain("Taken back.");
    });
    expect(takeBack).toHaveBeenCalledWith({
      earningId: earningIn("paid").id,
      reason: "Wash trading",
    });
    expect(textOf(container)).toContain(
      "will be held back from what they earn next",
    );
    expect(button(container, "Show the updated list")).not.toBeNull();
  });

  it("says what the platform answered when it refuses, and keeps the form so it can be tried again", async () => {
    const container = await row(earningIn("payable"), {
      takeBack: vi.fn(async () => ({
        reason: "already-taken-back" as const,
        status: "refused" as const,
      })),
    });
    await open(container);
    await typeInto(
      fieldByLabel(container, "Why are you taking it back?"),
      "Why",
    );
    await click(button(container, "Take back 300 sats"));
    await settle(() => {
      expect(container.querySelector('[role="alert"]')?.textContent).toContain(
        "already taken back",
      );
    });
    expect(button(container, "Take back 300 sats")).not.toBeNull();
  });

  it("says nothing is known to have changed when the platform did not answer", async () => {
    const container = await row(earningIn("payable"), {
      takeBack: vi.fn(async () => {
        throw new Error("offline");
      }),
    });
    await open(container);
    await typeInto(
      fieldByLabel(container, "Why are you taking it back?"),
      "Why",
    );
    await click(button(container, "Take back 300 sats"));
    await settle(() => {
      expect(container.querySelector('[role="alert"]')?.textContent).toContain(
        "nothing is known to have changed",
      );
    });
  });
});

describe("the line of an earning", () => {
  it("offers the button only to someone who may, and only on an earning that can still be taken back", async () => {
    const staff = await row(earningIn("payable"), { mayTakeBack: false });
    expect(staff.querySelector("button")).toBeNull();
    const undone = await row(
      earningIn("payable", {
        takenBack: { at, by: "Ada Admin", reason: "Wash trading" },
      }),
    );
    expect(undone.querySelector("button")).toBeNull();
    const reversal = await row(earningIn("reversal"));
    expect(reversal.querySelector("button")).toBeNull();
  });

  it("says of a taken-back earning, and of the line that undid it, who did it, when and why", async () => {
    const takenBack = { at, by: "Ada Admin", reason: "Wash trading" };
    const earning = await row(earningIn("payable", { takenBack }));
    expect(textOf(earning)).toContain("Taken back by Ada Admin");
    expect(textOf(earning)).toContain("Wash trading");
    expect(textOf(earning)).toContain("Taken back");
    const undoing = await row(earningIn("reversal", { takenBack }));
    expect(textOf(undoing)).toContain("Undoes an earlier earning");
    expect(textOf(undoing)).toContain("Ada Admin");
    const gone = await row(
      earningIn("payable", { takenBack: { ...takenBack, by: null } }),
    );
    expect(textOf(gone)).toContain("an account that is gone");
  });
});
