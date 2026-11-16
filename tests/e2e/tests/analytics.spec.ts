import { expect, test, type Page } from "@playwright/test";
import { gunzipSync } from "node:zlib";

import { fixtureGame } from "./support/fixture-game.ts";
import { expectConnectedToPlatform } from "./support/platform-connection.ts";

// A page counts itself through the platform's own address, which forwards to the analytics provider (a stand-in here, running for the whole
// test run). The build for these tests names the posthog provider for analytics (see the e2e job's build step). What the page sends is read
// where it leaves the browser. One project runs this; the page counting is the same in the others.
const analyticsPath = "/telemetry/events";
test.beforeEach(() => {
  test.skip(test.info().project.name !== "desktop", "Desktop only.");
});

interface Counted {
  readonly event: string;
  readonly properties: Record<string, unknown>;
}

// Everything the page sends to the analytics address, decoded, and every address it asked for outside the platform's own.
function watch(page: Page, origin: string) {
  const sent: Counted[] = [];
  const outside: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.origin !== origin) outside.push(request.url());
    if (!url.pathname.startsWith(analyticsPath)) return;
    const raw = request.postDataBuffer();
    if (raw === null) return;
    const text = (raw[0] === 0x1f ? gunzipSync(raw) : raw).toString("utf8");
    const payload = JSON.parse(text) as
      Counted | { batch: Counted[] } | Counted[];
    const events =
      "batch" in payload
        ? payload.batch
        : Array.isArray(payload)
          ? payload
          : [payload];
    sent.push(...events);
  });
  return { outside, sent };
}

const names = (sent: readonly Counted[]) => sent.map(({ event }) => event);

test("a page is counted once it is shown, by its address without the query, and nothing else is sent unasked", async ({
  baseURL,
  context,
  page,
}) => {
  if (baseURL === undefined) throw new Error("No base URL");
  const { outside, sent } = watch(page, new URL(baseURL).origin);
  await context.addCookies([
    { name: "frostbite_session", url: baseURL, value: "SECRET-SESSION" },
  ]);
  await page.goto("/games?code=SECRET-CODE");
  await expect
    .poll(() => names(sent), { timeout: 20_000 })
    .toContain("$pageview");
  // Clicking and scrolling are not counted: nothing is captured by itself.
  await page.mouse.click(10, 10);
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(4_000);
  const view = sent.find(({ event }) => event === "$pageview");
  expect(String(view?.properties.$current_url)).toMatch(/\/games$/u);
  expect(view?.properties.$pathname).toBe("/games");
  expect(JSON.stringify(sent)).not.toContain("SECRET");
  // Only a page view, which the library makes, and the platform's own events: no clicks, no scrolling, no page leaves, no recordings.
  expect(names(sent).filter((name) => name !== "$pageview")).toEqual([]);
  // The page talked only to its own server, and kept nothing in the browser.
  expect(outside).toEqual([]);
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
  expect(await page.evaluate(() => Object.keys(sessionStorage))).toEqual([]);
  expect(await page.evaluate(() => document.cookie)).not.toContain("ph_");
  expect((await context.cookies()).map(({ name }) => name)).toEqual([
    "frostbite_session",
  ]);
});

test("opening a game counts the game by its name, and moving to another page counts that page", async ({
  baseURL,
  page,
}) => {
  if (baseURL === undefined) throw new Error("No base URL");
  const { outside, sent } = watch(page, new URL(baseURL).origin);
  await page.goto(fixtureGame.href);
  await expectConnectedToPlatform(page);
  await expect
    .poll(() => names(sent), { timeout: 20_000 })
    .toContain("game_opened");
  const opened = sent.find(({ event }) => event === "game_opened");
  expect(opened?.properties.game).toBe(fixtureGame.id);
  // Only the properties the catalogue allows, and the library's own plain facts about the page.
  expect(opened?.properties).not.toHaveProperty("$exception_list");
  await page
    .locator(".arcade-stage__bar")
    .getByRole("link", { name: "All games" })
    .click();
  await expect(page).toHaveURL(/\/games$/u);
  await expect
    .poll(
      () =>
        sent.filter(
          ({ event, properties }) =>
            event === "$pageview" && properties.$pathname === "/games",
        ).length,
      { timeout: 20_000 },
    )
    .toBeGreaterThan(0);
  expect(outside).toEqual([]);
});
