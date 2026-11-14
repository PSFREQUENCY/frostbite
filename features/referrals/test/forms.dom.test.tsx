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

import type { ReferralsApi } from "../src/client/api.ts";
import { CopyLink } from "../src/ui/copy-link.tsx";
import { FreezeForm } from "../src/ui/freeze-form.tsx";
import { ProgramPanel } from "../src/ui/program-panel.tsx";

const initial = {
  enabled: true,
  maturitySeconds: "3600",
  minimumPayoutUnits: "10000",
  rateBasisPoints: "300",
};
const api = (over: Partial<ReferralsApi> = {}): ReferralsApi => ({
  setFrozen: vi.fn(async () => ({ frozen: true, status: "saved" as const })),
  setProgram: vi.fn(async () => ({ status: "saved" as const })),
  ...over,
});
const panel = (a: ReferralsApi) => (
  <ProgramPanel
    api={a}
    initial={initial}
    maximumMaturitySeconds={2_592_000}
    maximumMinimumPayoutUnits="10000000"
  />
);
const field = (container: HTMLElement, label: string) => {
  const found = fieldByLabel(container, label);
  if (found === null) throw new Error(`no field ${label}`);
  return found;
};
const save = (container: HTMLElement) => {
  const found = button(container, "Save program");
  if (found === null) throw new Error("no save button");
  return found;
};

describe("the program form", () => {
  it("starts filled with what is in force, with nothing to save until something changes", async () => {
    const container = await mount(panel(api()));
    expect(
      field(container, "Share of the fee (hundredths of a percent)"),
    ).toHaveProperty("value", "300");
    expect(field(container, "Minimum payout (sats)")).toHaveProperty(
      "value",
      "10000",
    );
    expect(field(container, "Wait before payable (seconds)")).toHaveProperty(
      "value",
      "3600",
    );
    expect(save(container).disabled).toBe(true);
  });

  it("sends every setting together, as numbers and digits, and says what was saved", async () => {
    const a = api();
    const container = await mount(panel(a));
    await typeInto(
      field(container, "Share of the fee (hundredths of a percent)"),
      "250",
    );
    await typeInto(field(container, "Minimum payout (sats)"), "5000");
    click(container.querySelector('input[type="checkbox"]'));
    click(save(container));
    await settle(() => expect(textOf(container)).toContain("Saved."));
    expect(a.setProgram).toHaveBeenCalledWith({
      enabled: false,
      maturitySeconds: 3_600,
      minimumPayoutUnits: "5000",
      rateBasisPoints: 250,
    });
    expect(textOf(container)).toContain("Earning is off");
  });

  it("holds back a rate outside 1 to 9,999, a wait past the ceiling, and a minimum that is not digits, saying which", async () => {
    const a = api();
    const container = await mount(panel(a));
    for (const [label, value, message] of [
      [
        "Share of the fee (hundredths of a percent)",
        "0",
        "A whole number from 1 to 9,999.",
      ],
      [
        "Share of the fee (hundredths of a percent)",
        "10000",
        "A whole number from 1 to 9,999.",
      ],
      ["Wait before payable (seconds)", "2592001", "at most 2592000"],
      ["Minimum payout (sats)", "1.5", "Whole sats, in digits only"],
    ] as const) {
      await typeInto(field(container, label), value);
      expect(textOf(container)).toContain(message);
      expect(save(container).disabled).toBe(true);
      await typeInto(
        field(container, label),
        initial[
          label.startsWith("Share")
            ? "rateBasisPoints"
            : label.startsWith("Wait")
              ? "maturitySeconds"
              : "minimumPayoutUnits"
        ],
      );
    }
    expect(a.setProgram).not.toHaveBeenCalled();
  });

  it("says what a refusal means, and that the platform did not answer when it did not, without claiming a change", async () => {
    const refused = await mount(
      panel(
        api({
          setProgram: vi.fn(async () => ({
            reason: "above-maximum" as const,
            status: "refused" as const,
          })),
        }),
      ),
    );
    await typeInto(field(refused, "Minimum payout (sats)"), "99999999");
    click(save(refused));
    await settle(() =>
      expect(textOf(refused)).toContain("Nothing was changed."),
    );
    expect(refused.querySelector('[role="alert"]')).not.toBeNull();

    const down = await mount(
      panel(
        api({
          setProgram: vi.fn(async () => {
            throw new Error("offline");
          }),
        }),
      ),
    );
    await typeInto(field(down, "Minimum payout (sats)"), "20000");
    click(save(down));
    await settle(() => expect(textOf(down)).toContain("did not answer"));
    expect(textOf(down)).not.toContain("Saved.");
  });
});

describe("the pause form", () => {
  const reason = (container: HTMLElement) => field(container, "Reason");
  const press = (container: HTMLElement, label: string) => {
    const found = button(container, label);
    if (found === null) throw new Error(`no button ${label}`);
    return found;
  };

  it("sends nothing without a reason, then pauses with it, and says so", async () => {
    const a = api();
    const container = await mount(
      <FreezeForm api={a} frozen={false} referrerId="r1" />,
    );
    expect(press(container, "Pause earning").disabled).toBe(true);
    await typeInto(reason(container), "  Looks like farming.  ");
    click(press(container, "Pause earning"));
    await settle(() =>
      expect(textOf(container)).toContain("Earning is paused."),
    );
    expect(a.setFrozen).toHaveBeenCalledWith({
      frozen: true,
      reason: "Looks like farming.",
      referrerId: "r1",
    });
    expect(reason(container)).toHaveProperty("value", "");
  });

  it("resumes a paused referrer, and says so", async () => {
    const a = api({
      setFrozen: vi.fn(async () => ({
        frozen: false,
        status: "saved" as const,
      })),
    });
    const container = await mount(
      <FreezeForm api={a} frozen referrerId="r1" />,
    );
    await typeInto(reason(container), "Cleared.");
    click(press(container, "Resume earning"));
    await settle(() =>
      expect(textOf(container)).toContain("Earning is on again."),
    );
    expect(a.setFrozen).toHaveBeenCalledWith({
      frozen: false,
      reason: "Cleared.",
      referrerId: "r1",
    });
  });

  it("says a refusal as the platform gave it, and that it did not answer when it did not", async () => {
    const refused = await mount(
      <FreezeForm
        api={api({
          setFrozen: vi.fn(async () => ({
            reason: "not-found" as const,
            status: "refused" as const,
          })),
        })}
        frozen={false}
        referrerId="gone"
      />,
    );
    await typeInto(reason(refused), "Why not");
    click(press(refused, "Pause earning"));
    await settle(() => expect(textOf(refused)).toContain("No such referrer."));
    const down = await mount(
      <FreezeForm
        api={api({
          setFrozen: vi.fn(async () => {
            throw new Error("offline");
          }),
        })}
        frozen={false}
        referrerId="r1"
      />,
    );
    await typeInto(reason(down), "Why");
    click(press(down, "Pause earning"));
    await settle(() => expect(textOf(down)).toContain("did not answer"));
  });
});

describe("the link", () => {
  it("shows the whole address once the page knows it, and copies it", async () => {
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    const container = await mount(<CopyLink path="/r/BCDFGHJK" />);
    const input = container.querySelector<HTMLInputElement>("input");
    await settle(() =>
      expect(input?.value).toBe(`${window.location.origin}/r/BCDFGHJK`),
    );
    click(button(container, "Copy link"));
    await settle(() => expect(textOf(container)).toContain("Copied"));
    expect(writeText).toHaveBeenCalledWith(
      `${window.location.origin}/r/BCDFGHJK`,
    );
    expect(button(container, "Share")).toBeNull();
  });

  it("leaves the text to select when the device cannot copy, and offers the share sheet where there is one", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: vi.fn(async () => {
          throw new Error("denied");
        }),
      },
    });
    const share = vi.fn(async () => undefined);
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: share,
    });
    const container = await mount(<CopyLink path="/r/BCDFGHJK" />);
    await settle(() => expect(button(container, "Share")).not.toBeNull());
    click(button(container, "Copy link"));
    await settle(() => expect(textOf(container)).not.toContain("Copied"));
    click(button(container, "Share"));
    await settle(() =>
      expect(share).toHaveBeenCalledWith({
        text: "Join me and play. Use my link:",
        url: `${window.location.origin}/r/BCDFGHJK`,
      }),
    );
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: vi.fn(async () => {
        throw new Error("closed");
      }),
    });
    click(button(container, "Share"));
    await settle(() => expect(textOf(container)).not.toContain("Copied"));
  });
});
