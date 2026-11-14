import {
  button,
  chooseOption,
  click,
  mount,
  settle,
  textOf,
} from "@frostbite/test-kit/dom";
import { describe, expect, it, vi } from "vitest";

import { PayoutClaim } from "../src/ui/payout-claim.tsx";
import { ReferralsPage } from "../src/ui/referrals-page.tsx";
import { fakeApi } from "./support/fake-api.ts";
import { feeAsset, mine, navigationFor, program } from "./support/data.ts";

const api = fakeApi;
const wallets = ["tb1qfirst", "tb1qsecond"];
const ready = mine({
  pots: [
    {
      assetKey: feeAsset,
      inFlight: 0n,
      maturing: 0n,
      paid: 0n,
      payable: 20_000n,
    },
  ],
});
const page = (extra: object = {}) => (
  <ReferralsPage
    mine={ready}
    navigation={navigationFor(false)}
    program={program()}
    wallets={wallets}
    {...extra}
  />
);
const ask = (container: HTMLElement) => {
  const found = button(container, "Ask to be paid");
  if (found === null) throw new Error("no button");
  return found;
};
const payout = (state: "in_progress" | "requested") => ({
  amount: 20_000n,
  assetKey: feeAsset,
  beneficiaryId: "b",
  completedAt: null,
  createdAt: new Date(0),
  destination: "d",
  executor: null,
  executorRef: null,
  failureReason: null,
  id: "p",
  programKey: "referral",
  state,
  updatedAt: new Date(0),
});

describe("asking to be paid", () => {
  it("is offered once the minimum is reached, with the wallets of the account to choose from, and asks for the first by default", async () => {
    const a = api();
    const container = await mount(page({ api: a }));
    expect(textOf(container)).toContain("You have reached the minimum.");
    const options = [...container.querySelectorAll("option")].map(
      (option) => option.value,
    );
    expect(options).toEqual(wallets);
    click(ask(container));
    await settle(() => expect(textOf(container)).toContain("is asked for"));
    expect(a.requestPayout).toHaveBeenCalledWith({
      assetKey: feeAsset,
      destination: "tb1qfirst",
    });
    expect(textOf(container)).toContain("20,000 sats");
  });

  it("asks for the wallet that was chosen", async () => {
    const a = api();
    const container = await mount(page({ api: a }));
    await chooseOption(container, "tb1qsecond");
    click(ask(container));
    await settle(() => expect(a.requestPayout).toHaveBeenCalled());
    expect(a.requestPayout).toHaveBeenCalledWith({
      assetKey: feeAsset,
      destination: "tb1qsecond",
    });
  });

  it("says what stopped it, with the figures for a pot that is too small, and that nothing is known when the platform did not answer", async () => {
    const small = await mount(
      <PayoutClaim
        api={api({
          requestPayout: vi.fn(async () => ({
            minimumUnits: "546",
            payableUnits: "150",
            reason: "below-dust" as const,
            status: "refused" as const,
          })),
        })}
        assetKey={feeAsset}
        wallets={wallets}
      />,
    );
    click(ask(small));
    await settle(() =>
      expect(textOf(small)).toContain(
        "Payouts start at 546 sats, and you have 150 sats ready.",
      ),
    );
    const refused = await mount(
      <PayoutClaim
        api={api({
          requestPayout: vi.fn(async () => ({
            reason: "invalid-destination" as const,
            status: "refused" as const,
          })),
        })}
        assetKey={feeAsset}
        wallets={wallets}
      />,
    );
    click(ask(refused));
    await settle(() =>
      expect(textOf(refused)).toContain("not one the network accepts"),
    );
    const down = await mount(
      <PayoutClaim
        api={api({
          requestPayout: vi.fn(async () => {
            throw new Error("offline");
          }),
        })}
        assetKey={feeAsset}
        wallets={wallets}
      />,
    );
    click(ask(down));
    await settle(() => expect(textOf(down)).toContain("did not answer"));
  });

  it("sends a person with no wallet to their account page, and offers nothing to ask", async () => {
    const container = await mount(page({ wallets: [] }));
    expect(textOf(container)).toContain("you need a wallet on your account");
    expect(button(container, "Ask to be paid")).toBeNull();
    expect(
      [...container.querySelectorAll("a")].map((a) => a.getAttribute("href")),
    ).toContain("/account");
  });

  it("shows a payout that is waiting for a batch, or in one, in place of the button", async () => {
    const waiting = await mount(page({ open: [payout("requested")] }));
    expect(textOf(waiting)).toContain("waiting for the team's next batch");
    expect(button(waiting, "Ask to be paid")).toBeNull();
    const inBatch = await mount(page({ open: [payout("in_progress")] }));
    expect(textOf(inBatch)).toContain("is being paid now");
  });

  it("shows no button below the minimum, and the way to it as before", async () => {
    const container = await mount(
      <ReferralsPage
        mine={mine()}
        navigation={navigationFor(false)}
        program={program()}
        wallets={wallets}
      />,
    );
    expect(button(container, "Ask to be paid")).toBeNull();
    expect(textOf(container)).toContain("needed to ask for a payout");
  });
});
