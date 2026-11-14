import { expect, test, type Page } from "@playwright/test";

import { creatorE2EFixtures } from "../src/creator-fixtures.ts";
import { asAdmin } from "./support/admin-session.ts";
import { openWalletMenu, walletMenu } from "./support/fake-wallet.ts";
import { closeMatrix, prepare, skipToMain } from "./support/quality.ts";

// The referral pages on the real stack (ADR-026, REF-1c). The pages that only read run on every viewport, each with the accessibility and
// layout matrix; what changes the program runs on the desktop only and one test at a time, because the program is one record every viewport
// reads.

const heading = (page: Page, name: string) =>
  expect(
    page.getByRole("heading", { exact: true, level: 1, name }),
  ).toBeVisible();

test("a visitor is told the incentive, and offered the way to sign in, before joining", async ({
  baseURL,
  page,
}) => {
  if (baseURL === undefined) throw new Error("Expected configured base URL");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/referrals");
  await heading(page, "Bring a friend, earn from every mint");
  await expect(page.getByText("Sign in to get your own link")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Sign in" }).last(),
  ).toHaveAttribute("href", "/sign-in?returnTo=%2Freferrals");
  await expect(page.getByLabel("Your referral link")).toHaveCount(0);
  await skipToMain(page);
  await closeMatrix(page, "referrals-visitor.png");
});

test("a signed-in person has their link, a pot of nothing and an empty history, and a link that is theirs", async ({
  baseURL,
  page,
}) => {
  await prepare(page, baseURL, creatorE2EFixtures.applicant.sessionToken);
  await page.goto("/referrals");
  await expect(page.getByText("ready to be paid")).toBeVisible();
  const link = page.getByLabel("Your referral link");
  await expect(link).toHaveValue(/\/r\/[2-9B-DF-HJ-NP-TV-Z]{8}$/u);
  await expect(
    page.getByText("Nobody has signed up with your link yet"),
  ).toBeVisible();
  await closeMatrix(page, "referrals-player.png");

  await page.getByRole("link", { name: "See every earning" }).click();
  await heading(page, "Your referral history");
  await expect(page.getByText("Nothing earned yet.")).toBeVisible();
  await closeMatrix(page, "referrals-history-empty.png");
});

test("the way to the referral page is in the wallet menu of someone signed in", async ({
  baseURL,
  page,
}) => {
  await prepare(page, baseURL, creatorE2EFixtures.applicant.sessionToken);
  await page.goto("/account");
  await openWalletMenu(page);
  await walletMenu(page)
    .getByRole("link", { exact: true, name: "Referrals" })
    .click();
  await expect(page).toHaveURL(/\/referrals$/u);
  await heading(page, "Bring a friend, earn from every mint");
});

test("a person's link leads to the sign-in page with the code, and the history needs a session", async ({
  baseURL,
  page,
}) => {
  await prepare(page, baseURL, creatorE2EFixtures.applicant.sessionToken);
  await page.goto("/referrals");
  const code = (await page.getByLabel("Your referral link").inputValue())
    .split("/r/")
    .at(-1);
  expect(code).toMatch(/^[2-9B-DF-HJ-NP-TV-Z]{8}$/u);
  await page.context().clearCookies();
  await page.goto(`/r/${code ?? ""}`);
  await expect(page).toHaveURL(
    new RegExp(`/sign-in\\?ref=${code ?? ""}$`, "u"),
  );
  await page.goto("/referrals/history");
  await expect(page).toHaveURL(/\/sign-in\?returnTo=/u);
});

test.describe("running the program", () => {
  test.describe.configure({ mode: "serial" });
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Desktop only.");
    await page.emulateMedia({ reducedMotion: "reduce" });
  });

  test("staff may look and not change: they have the overview and the referrers, not the program, and the routes refuse them", async ({
    baseURL,
    page,
  }) => {
    await prepare(page, baseURL, creatorE2EFixtures.staff.sessionToken);
    await page.goto("/admin/referrals");
    await heading(page, "Referrals");
    const sections = page.getByRole("navigation", {
      name: "Referral sections",
    });
    await expect(sections.getByRole("link")).toHaveText([
      "Overview",
      "Referrers",
    ]);
    await expect(
      sections.getByRole("link", { name: "Overview" }),
    ).toHaveAttribute("aria-current", "page");
    await expect(page.getByText("What the platform owes")).toBeVisible();
    await closeMatrix(page, "referrals-admin-overview.png");

    await sections.getByRole("link", { name: "Referrers" }).click();
    await expect(
      page.getByRole("heading", { exact: true, name: "Referrers" }),
    ).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Show" })).toBeVisible();
    await closeMatrix(page, "referrals-admin-referrers.png");

    await page.goto("/admin/referrals/program");
    await expect(page.getByRole("heading", { name: "Now" })).toHaveCount(0);
    expect(
      (
        await page.request.post("/api/v1/referrals/admin/program", {
          data: {
            enabled: true,
            maturitySeconds: 0,
            minimumPayoutUnits: "0",
            rateBasisPoints: 300,
          },
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await page.request.post("/api/v1/referrals/admin/freeze", {
          data: {
            frozen: true,
            reason: "No",
            referrerId: "0198a5c4-7b3e-7c1a-8f2d-4e5b6a7c8d9e",
          },
        })
      ).status(),
    ).toBe(403);
  });

  test("an administrator switches the program on, and a visitor is told the new terms at once; switching it off is said as well", async ({
    baseURL,
    browser,
    page,
  }) => {
    await asAdmin(page, baseURL);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/admin/referrals/program");
    await heading(page, "Referrals");
    await expect(
      page
        .getByRole("navigation", { name: "Referral sections" })
        .getByRole("link"),
    ).toHaveText(["Overview", "Program", "Referrers"]);
    await page.getByLabel("Earning is on").check();
    await page
      .getByLabel("Share of the fee (hundredths of a percent)")
      .fill("250");
    await page.getByLabel("Minimum payout (sats)").fill("5000");
    await page.getByLabel("Wait before payable (seconds)").fill("3600");
    await page.getByRole("button", { name: "Save program" }).click();
    await expect(page.getByRole("status")).toContainText(
      "Saved. Earning is on",
    );

    const visitor = await (await browser.newContext({ baseURL })).newPage();
    await visitor.goto("/referrals");
    await expect(
      visitor.getByText("You earn 2.5% of the platform fee"),
    ).toBeVisible();
    await expect(visitor.getByText("5,000 sats")).toBeVisible();
    await expect(visitor.getByText("waits 1 hour")).toBeVisible();

    await page.reload();
    await expect(page.getByText("by E2E administrator")).toBeVisible();
    await closeMatrix(page, "referrals-admin-program.png");

    await page.getByLabel("Earning is on").uncheck();
    await page.getByRole("button", { name: "Save program" }).click();
    await expect(page.getByRole("status")).toContainText("Earning is off");
    await visitor.reload();
    await expect(visitor.getByText("switched off right now")).toBeVisible();
    await visitor.context().close();
  });

  test("a rate or a ceiling that is wrong is held back before anything is sent", async ({
    baseURL,
    page,
  }) => {
    await asAdmin(page, baseURL);
    await page.goto("/admin/referrals/program");
    await page
      .getByLabel("Share of the fee (hundredths of a percent)")
      .fill("0");
    await expect(
      page.getByText("A whole number from 1 to 9,999."),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Save program" }),
    ).toBeDisabled();
    await page
      .getByLabel("Share of the fee (hundredths of a percent)")
      .fill("250");
    await page.getByLabel("Wait before payable (seconds)").fill("99999999");
    await expect(page.getByText("at most 2592000")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Save program" }),
    ).toBeDisabled();
  });
});
