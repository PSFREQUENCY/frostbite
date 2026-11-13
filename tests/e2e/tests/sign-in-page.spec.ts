import { expect, test } from "@playwright/test";

import { testWallets } from "@frostbite/auth/test-fixtures";
import { connectWallet, installFakeWallet } from "./support/fake-wallet.ts";

// Finding the way to sign in, and choosing how, in a real browser. Nothing here signs anyone in (that is `wallet-sign-in.spec.ts` and
// `email-sign-in.spec.ts`), so the wallet is shared with the widget's own tests.
const wallet = testWallets[0];

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Desktop only.");
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("the header of any page leads a signed-out visitor to sign in, and says so plainly once a wallet is waiting to be signed with", async ({
  page,
}) => {
  await installFakeWallet(page, wallet);
  await page.goto("/games");
  const link = page.getByRole("banner").getByRole("link", { name: "Sign in" });
  await expect(link).toBeVisible();
  await expect(link).not.toHaveAttribute("data-waiting", "true");
  // Connecting a wallet is not signing in, so the link stays, and now stands out.
  await connectWallet(page, wallet);
  await expect(link).toHaveAttribute("data-waiting", "true");
  await link.click();
  await expect(page).toHaveURL(/\/sign-in$/u);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

test("the sign-in page offers each method as a key, shows one method at a time, and answers the keyboard", async ({
  page,
}) => {
  await page.goto("/sign-in");
  // The header has a "Connect wallet" button of its own, so the method's buttons are looked for in the open panel.
  const panel = page.getByRole("tabpanel");
  const keys = page.getByRole("tablist").getByRole("tab");
  await expect(keys).toHaveText([/Wallet/u, /Passkey/u, /Email/u]);
  await expect(keys.first()).toHaveAttribute("aria-selected", "true");
  await expect(panel).toHaveCount(1);
  await expect(
    panel.getByRole("button", { name: "Connect wallet" }),
  ).toBeVisible();

  await keys.nth(1).click();
  await expect(
    panel.getByRole("button", { name: "Sign in with passkey" }),
  ).toBeVisible();
  await expect(
    panel.getByRole("button", { name: "Connect wallet" }),
  ).toBeHidden();

  await keys.nth(1).press("ArrowRight");
  await expect(keys.nth(2)).toBeFocused();
  await expect(page.getByLabel("Email address")).toBeVisible();
  await keys.nth(2).press("Home");
  await expect(keys.first()).toBeFocused();
  await expect(
    panel.getByRole("button", { name: "Connect wallet" }),
  ).toBeVisible();
});

test("a referral link leads to the sign-in page with the invitation code filled in, sets no cookie, and the code can be typed instead", async ({
  context,
  page,
}) => {
  await page.goto("/r/bcdfghjk");
  await expect(page).toHaveURL(/\/sign-in\?ref=BCDFGHJK$/u);
  const field = page.getByLabel("Invitation code (optional)");
  await expect(field).toHaveValue("BCDFGHJK");
  // Nothing is kept in the browser: the code is in the address and goes with the sign-in request.
  const cookies = await context.cookies();
  expect(cookies.map(({ name }) => name)).toEqual([]);

  // A link that is not a code leads to the plain page, where the code may be typed and is checked as it is.
  await page.goto("/r/nothing");
  await expect(page).toHaveURL(/\/sign-in$/u);
  await page.getByText("Have an invitation code?").click();
  await page.getByLabel("Invitation code (optional)").fill("nope");
  await expect(page.getByRole("alert")).toContainText("8 letters and numbers");
  await page.getByLabel("Invitation code (optional)").fill("23456789");
  await expect(page.getByRole("alert")).toHaveCount(0);
});
