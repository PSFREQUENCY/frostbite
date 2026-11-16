import { button, click, mount, settle, textOf } from "@frostbite/test-kit/dom";
import type { ReferralCoverResponse } from "@frostbite/shared/referrals";
import { describe, expect, it, vi } from "vitest";

import { CoverCheck } from "../src/ui/cover-check.tsx";
import { feeAsset } from "./support/data.ts";
import { fakeApi } from "./support/fake-api.ts";

const ok = (
  over: Partial<Extract<ReferralCoverResponse, { status: "ok" }>> = {},
): ReferralCoverResponse => ({
  heldUnits: "100000",
  payments: 2,
  pendingUnits: "0",
  status: "ok",
  waitingUnits: "50000",
  ...over,
});
const look = async (answer: ReferralCoverResponse | Error, wallet = "w") => {
  const cover = vi.fn(async () => {
    if (answer instanceof Error) throw answer;
    return answer;
  });
  const container = await mount(
    <CoverCheck api={fakeApi({ cover })} assetKey={feeAsset} wallet={wallet} />,
  );
  return { container, cover };
};
const press = async (container: HTMLElement) => {
  await click(button(container, "Check the wallet covers it"));
  await settle(() => {
    expect(container.querySelector('[role="status"]')).not.toBeNull();
  });
};

describe("looking at whether the paying wallet covers what is waiting", () => {
  it("asks only when pressed, for the asset and the wallet as typed, and says it covers the payments with the fee still to come", async () => {
    const { container, cover } = await look(ok(), "  sim:payer  ");
    expect(cover).not.toHaveBeenCalled();
    await press(container);
    expect(cover).toHaveBeenCalledWith({
      assetKey: feeAsset,
      wallet: "sim:payer",
    });
    const text = textOf(container);
    expect(text).toContain("2 payouts wait");
    expect(text).toContain("covers the payments");
    expect(text).toContain("network fee comes on top");
  });

  it("says by how much a wallet is short, and mentions what is still unconfirmed", async () => {
    const { container } = await look(
      ok({ heldUnits: "20000", pendingUnits: "5000", payments: 1 }),
    );
    await press(container);
    const text = textOf(container);
    expect(text).toContain("1 payout waits");
    expect(text).toContain("short by 30,000 sats");
    expect(text).toContain("still waiting for its first confirmation");
    expect(text).not.toContain("covers the payments");
  });

  it("says there is nothing to cover when nothing is waiting", async () => {
    const { container } = await look(ok({ payments: 0, waitingUnits: "0" }));
    await press(container);
    expect(textOf(container)).toContain("nothing to cover");
  });

  it("says what a refusal means, and that the platform did not answer", async () => {
    const refused = await look({ reason: "invalid-wallet", status: "refused" });
    await press(refused.container);
    expect(textOf(refused.container)).toContain(
      "not an address on this network",
    );
    const down = await look({ reason: "chain-unavailable", status: "refused" });
    await press(down.container);
    expect(textOf(down.container)).toContain("cannot read that network");
    const lost = await look(new Error("offline"));
    await press(lost.container);
    expect(textOf(lost.container)).toContain("did not answer");
  });

  it("cannot be pressed without a wallet", async () => {
    const { container } = await look(ok(), "   ");
    expect(button(container, "Check the wallet covers it")?.disabled).toBe(
      true,
    );
  });
});
