import { button, mount, textOf } from "@frostbite/test-kit/dom";
import { describe, expect, it } from "vitest";

import { AdminOverview } from "../src/ui/admin-overview.tsx";
import { AdminProgram } from "../src/ui/admin-program.tsx";
import { ReferrerPage } from "../src/ui/referrer-page.tsx";
import { ReferrersList, referrersHref } from "../src/ui/referrers-list.tsx";
import {
  detail,
  navigationFor,
  overview,
  program,
  referrersPage,
} from "./support/data.ts";

const staff = navigationFor(false);
const admin = navigationFor(true);
const hrefs = (container: HTMLElement) =>
  [...container.querySelectorAll("a")].map((a) => a.getAttribute("href"));
const current = (container: HTMLElement) =>
  container.querySelector('nav[aria-label="Referral sections"] [aria-current]')
    ?.textContent;
const ceilings = {
  maximumMaturitySeconds: 2_592_000,
  maximumMinimumPayoutUnits: "10000000",
};

describe("the admin section's links", () => {
  it("offer Overview and Referrers to staff, and Program as well to an administrator, marking the page being shown", async () => {
    const asStaff = await mount(
      <AdminOverview navigation={staff} overview={overview()} />,
    );
    const links = (c: HTMLElement) =>
      [...c.querySelectorAll('nav[aria-label="Referral sections"] a')].map(
        (a) => a.textContent,
      );
    expect(links(asStaff)).toEqual(["Overview", "Referrers"]);
    expect(current(asStaff)).toBe("Overview");
    const asAdmin = await mount(
      <AdminOverview navigation={admin} overview={overview()} />,
    );
    expect(links(asAdmin)).toEqual(["Overview", "Program", "Referrers"]);
  });
});

describe("the overview", () => {
  it("counts the people and totals what is owed from the ledger, and says it does not check the treasury", async () => {
    const container = await mount(
      <AdminOverview navigation={staff} overview={overview()} />,
    );
    const text = textOf(container);
    expect(text).toContain("Referrers2");
    expect(text).toContain("People brought5");
    expect(text).toContain("Of those, minted3");
    expect(text).toContain("Frozen1");
    expect(text).toContain("Owed in all130 sats");
    expect(text).toContain("Ready to pay100 sats");
    expect(text).toContain("Paid so far500 sats");
    expect(text).toContain("Checking them against what the treasury holds");
    expect(hrefs(container)).toContain("/admin/referrals/referrers");
  });

  it("says nothing is owed yet when nothing has been earned", async () => {
    const container = await mount(
      <AdminOverview navigation={staff} overview={overview({ assets: [] })} />,
    );
    expect(textOf(container)).toContain("Nothing has been earned yet.");
  });
});

describe("the program page", () => {
  it("shows what is in force, the form filled with it, and who changed what", async () => {
    const container = await mount(
      <AdminProgram
        ceilings={ceilings}
        history={[
          program(),
          program({ changedBy: null, enabled: false, id: "s0" }),
        ]}
        navigation={admin}
        program={program()}
        who={new Map([["0198a5c4-7b3e-7c1a-8f2d-4e5b6a7c8d9e", "Ada"]])}
      />,
    );
    const text = textOf(container);
    expect(text).toContain("Earning");
    expect(text).toContain("3%");
    expect(text).toContain("Minimum payout10,000 sats");
    expect(text).toContain("Wait before payable1 hour");
    expect(text).toContain("by Ada");
    expect(text).toContain("by an account that no longer exists");
    expect(current(container)).toBe("Program");
    const rate = container.querySelector<HTMLInputElement>(
      'input[type="text"], input:not([type])',
    );
    expect(rate?.value).toBe("300");
  });

  it("says the program is not set up, with the form ready, when nobody has set it", async () => {
    const container = await mount(
      <AdminProgram
        ceilings={ceilings}
        history={[]}
        navigation={admin}
        program={null}
        who={new Map()}
      />,
    );
    expect(textOf(container)).toContain("The program has not been set up.");
    expect(textOf(container)).toContain("Nobody has set the program yet.");
    expect(button(container, "Save program")?.disabled).toBe(true);
  });
});

describe("the list of referrers", () => {
  const view = { assetKey: "a", filter: "all", page: 1, sort: "pot" } as const;

  it("lists each referrer with how they stand, a link to their page, and a mark for one who is paused", async () => {
    const container = await mount(
      <ReferrersList list={referrersPage()} navigation={staff} view={view} />,
    );
    const text = textOf(container);
    expect(text).toContain("Ada");
    expect(text).toContain("2 brought · 130 sats waiting · 500 sats paid");
    expect(text).toContain("no earning yet");
    expect(text).toContain("Paused");
    expect(hrefs(container)).toContain(
      "/admin/referrals/referrers/0198a5c4-7b3e-7c1a-8f2d-4e5b6a7c8d01",
    );
  });

  it("links every filter and sort by address, marks the ones in use, and pages both ways", async () => {
    const container = await mount(
      <ReferrersList
        list={referrersPage({ hasMore: true })}
        navigation={staff}
        view={{ ...view, filter: "frozen", page: 2, sort: "recent" }}
      />,
    );
    expect(hrefs(container)).toEqual(
      expect.arrayContaining([
        "/admin/referrals/referrers?sort=recent",
        "/admin/referrals/referrers?filter=frozen&sort=recent",
        "/admin/referrals/referrers?filter=waiting&sort=recent",
        "/admin/referrals/referrers?filter=frozen",
        "/admin/referrals/referrers?filter=frozen&sort=referred",
      ]),
    );
    const marked = [
      ...container.querySelectorAll('nav [aria-current="true"]'),
    ].map((a) => a.textContent);
    expect(marked).toEqual(["Frozen", "Latest earning"]);
    expect(container.querySelector('a[rel="prev"]')?.getAttribute("href")).toBe(
      "/admin/referrals/referrers?filter=frozen&sort=recent",
    );
    expect(container.querySelector('a[rel="next"]')?.getAttribute("href")).toBe(
      "/admin/referrals/referrers?filter=frozen&sort=recent&page=3",
    );
  });

  it("says there are no referrers, or none that match, as the case is", async () => {
    const none = await mount(
      <ReferrersList
        list={referrersPage({ rows: [] })}
        navigation={staff}
        view={view}
      />,
    );
    expect(textOf(none)).toContain("Nobody has brought anyone yet.");
    const filtered = await mount(
      <ReferrersList
        list={referrersPage({ rows: [] })}
        navigation={staff}
        view={{ ...view, filter: "frozen" }}
      />,
    );
    expect(textOf(filtered)).toContain("No referrer matches this filter.");
    expect(referrersHref(view)).toBe("/admin/referrals/referrers");
  });
});

describe("one referrer's page", () => {
  const older = "/admin/referrals/referrers/x?after=y";

  it("shows who they are, their pot, each earning followed to its claim, the log of pauses, and the way to older ones", async () => {
    const container = await mount(
      <ReferrerPage detail={detail()} navigation={staff} older={older} />,
    );
    const text = textOf(container);
    expect(text).toContain("Ada");
    expect(text).toContain("Ready60 sats");
    expect(text).toContain("game-one · first · claim claim-9");
    expect(text).toContain("Not from a claim");
    expect(text).toContain("Taken back");
    expect(text).toContain("Paused");
    expect(text).toContain("Looked odd.");
    expect(hrefs(container)).toContain(older);
  });

  it("offers the pause form only to an administrator, and says what the button does", async () => {
    const asStaff = await mount(
      <ReferrerPage detail={detail()} navigation={staff} older={null} />,
    );
    expect(button(asStaff, "Pause earning")).toBeNull();
    expect(hrefs(asStaff)).not.toContain(older);
    const asAdmin = await mount(
      <ReferrerPage detail={detail()} navigation={admin} older={null} />,
    );
    expect(button(asAdmin, "Pause earning")).not.toBeNull();
    const paused = await mount(
      <ReferrerPage
        detail={detail({ frozen: true })}
        navigation={admin}
        older={null}
      />,
    );
    expect(button(paused, "Resume earning")).not.toBeNull();
    expect(textOf(paused)).toContain("Earning is paused for this person.");
  });

  it("is plain for a referrer with nothing yet", async () => {
    const container = await mount(
      <ReferrerPage
        detail={detail({
          code: null,
          earnings: { items: [], next: null },
          freezes: [],
          payouts: [],
          pots: [],
        })}
        navigation={staff}
        older={null}
      />,
    );
    const text = textOf(container);
    expect(text).toContain("Nothing earned yet.");
    expect(text).toContain("Never paused.");
    expect(text).toContain("No payouts yet.");
  });

  it("lists payouts with where they were to be paid", async () => {
    const container = await mount(
      <ReferrerPage
        detail={detail({
          payouts: [
            {
              amount: 90n,
              assetKey: "a",
              beneficiaryId: "b",
              completedAt: null,
              createdAt: new Date(0),
              destination: "sim:addr",
              executor: null,
              executorRef: null,
              failureReason: null,
              id: "p",
              programKey: "referral",
              state: "requested",
              updatedAt: new Date(0),
            },
          ],
        })}
        navigation={staff}
        older={null}
      />,
    );
    expect(textOf(container)).toContain("to sim:addr");
  });
});
