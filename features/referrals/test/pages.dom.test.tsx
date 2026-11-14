import { mount, textOf } from "@frostbite/test-kit/dom";
import { describe, expect, it } from "vitest";

import { HistoryPage } from "../src/ui/history-page.tsx";
import { NotFoundPage } from "../src/ui/not-found-page.tsx";
import { ReferralsPage } from "../src/ui/referrals-page.tsx";
import { history, mine, navigationFor, program } from "./support/data.ts";

const navigation = navigationFor(false);
const hrefs = (container: HTMLElement) =>
  [...container.querySelectorAll("a")].map((a) => a.getAttribute("href"));

describe("the referral page, before and after signing in", () => {
  it("tells a visitor the terms from the program record and offers to sign in, with no link and no pot", async () => {
    const container = await mount(
      <ReferralsPage mine={null} navigation={navigation} program={program()} />,
    );
    const text = textOf(container);
    expect(text).toContain("You earn 3% of the platform fee");
    expect(text).toContain("90 sats each time");
    expect(text).toContain("Sign in to get your own link");
    expect(hrefs(container)).toContain("/sign-in?returnTo=%2Freferrals");
    expect(text).not.toContain("Your link");
    expect(text).not.toContain("ready to be paid");
  });

  it("says earning is off, and states no terms, when the program is off or was never set up", async () => {
    for (const given of [program({ enabled: false }), null]) {
      const container = await mount(
        <ReferralsPage mine={null} navigation={navigation} program={given} />,
      );
      expect(textOf(container)).toContain("switched off right now");
      expect(textOf(container)).not.toContain("You earn");
    }
  });

  it("shows a referrer their link and code, who came, the pot with what waits, and the way to the minimum", async () => {
    const container = await mount(
      <ReferralsPage
        mine={mine()}
        navigation={navigation}
        program={program()}
      />,
    );
    const text = textOf(container);
    expect(text).toContain("90 sats");
    expect(text).toContain("ready to be paid");
    expect(text).toContain("30 sats still waiting");
    expect(text).toContain("90 sats of 10,000 sats needed to ask for a payout");
    expect(text).toContain("BCDFGHJK");
    expect(text).toContain("2 people signed up");
    expect(text).toContain("1 has minted");
    const link = container.querySelector<HTMLInputElement>(
      'input[aria-label="Your referral link"]',
    );
    expect(link?.value).toContain("/r/BCDFGHJK");
    expect(container.querySelector("progress")?.getAttribute("value")).toBe(
      "1",
    );
    expect(hrefs(container)).toContain("/referrals/history");
  });

  it("tells a referrer nobody has come yet, and shows a pot of nothing in the same place", async () => {
    const container = await mount(
      <ReferralsPage
        mine={mine({ minted: 0, pots: [], signedUp: 0 })}
        navigation={navigation}
        program={program()}
      />,
    );
    expect(textOf(container)).toContain(
      "Nobody has signed up with your link yet",
    );
    expect(textOf(container)).toContain("0 sats");
    expect(textOf(container)).not.toContain("people signed up");
  });

  it("says when the minimum is reached, and says earning is paused plainly when the referrer is frozen", async () => {
    const reached = await mount(
      <ReferralsPage
        mine={mine({
          pots: [
            {
              assetKey: "a",
              inFlight: 0n,
              maturing: 0n,
              paid: 0n,
              payable: 20_000n,
            },
          ],
        })}
        navigation={navigation}
        program={program()}
      />,
    );
    expect(textOf(reached)).toContain("You have reached the minimum.");
    const frozen = await mount(
      <ReferralsPage
        mine={mine({ frozen: true })}
        navigation={navigation}
        program={program()}
      />,
    );
    expect(textOf(frozen)).toContain("Earning is paused on your account");
  });

  it("shows no progress toward a minimum when there is none", async () => {
    const container = await mount(
      <ReferralsPage
        mine={mine()}
        navigation={navigation}
        program={program({ minimumPayout: 0n })}
      />,
    );
    expect(container.querySelector("progress")).toBeNull();
  });
});

describe("the history page", () => {
  it("lists each earning with its amount, when and where it stands, a taken-back one as such, and nothing of who minted", async () => {
    const container = await mount(
      <HistoryPage history={history()} navigation={navigation} />,
    );
    const text = textOf(container);
    expect(text).toContain("+90 sats");
    expect(text).toContain("−30 sats");
    expect(text).toContain("Ready");
    expect(text).toContain("Taken back");
    expect(text).toContain("2026-11-14 12:00 UTC");
    expect(text).toContain("No payouts yet.");
    expect(text).not.toContain("claim");
  });

  it("is empty with a plain sentence, and offers older earnings only when there are some", async () => {
    const empty = await mount(
      <HistoryPage
        history={history({ entries: { items: [], next: null } })}
        navigation={navigation}
      />,
    );
    expect(textOf(empty)).toContain("Nothing earned yet.");
    expect(textOf(empty)).not.toContain("Older");
    const paged = await mount(
      <HistoryPage
        history={history({
          entries: { items: history().entries.items, next: "a|b c" },
        })}
        navigation={navigation}
      />,
    );
    expect(hrefs(paged)).toContain("/referrals/history?after=a%7Cb%20c");
  });

  it("lists the payouts asked for, in their states", async () => {
    const container = await mount(
      <HistoryPage
        history={history({
          payouts: [
            {
              amount: 90n,
              assetKey: "a",
              at: new Date(0),
              id: "p1",
              state: "requested",
            },
            {
              amount: 50n,
              assetKey: "a",
              at: new Date(0),
              id: "p2",
              state: "failed",
            },
          ],
        })}
        navigation={navigation}
      />,
    );
    expect(textOf(container)).toContain("Waiting for a batch");
    expect(textOf(container)).toContain("Failed");
  });
});

describe("the page for what is not there", () => {
  it("says so in one way and links back to the referral page", async () => {
    const container = await mount(<NotFoundPage navigation={navigation} />);
    expect(textOf(container)).toContain(
      "does not exist, or it is not yours to see",
    );
    expect(hrefs(container)).toContain("/referrals");
  });
});
