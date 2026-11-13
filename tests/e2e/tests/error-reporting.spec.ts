import { expect, test, type Page } from "@playwright/test";

import {
  startErrorReportingStub,
  type ErrorReportingStub,
  type ReceivedReport,
} from "../src/error-reporting-stub.ts";

// A page that throws reports it to the platform's own address, which forwards the report to the error provider (a stand-in here). The build
// for these tests is made with the posthog provider (see the e2e job's build step), and the web server forwards to the stand-in.
// One project runs this, because the stand-in for the provider listens on one fixed address.
const notThisProject = () => test.info().project.name !== "desktop";
test.describe.configure({ mode: "serial" });

let started: ErrorReportingStub | undefined;
function stub(): ErrorReportingStub {
  if (started === undefined) throw new Error("The stand-in is not running.");
  return started;
}
test.beforeAll(async () => {
  if (!notThisProject()) started = await startErrorReportingStub();
});
test.afterAll(async () => {
  await started?.close();
});
test.beforeEach(() => {
  test.skip(notThisProject(), "Desktop only.");
  stub().received.length = 0;
});

const reports = () =>
  stub().received.filter((item) => item.url.startsWith("/e"));
const exceptions = (items: readonly ReceivedReport[]) =>
  items.flatMap((item) =>
    (
      JSON.parse(item.body) as {
        batch: {
          event: string;
          properties: Record<string, unknown> & {
            $exception_list?: { value: string }[];
          };
        }[];
      }
    ).batch.filter((event) => event.event === "$exception"),
  );

async function throwOnPage(page: Page, message: string) {
  await page.evaluate((text) => {
    setTimeout(() => {
      throw new Error(text);
    }, 50);
  }, message);
}

test("a page that throws is reported through the platform's own address, with nothing private in it", async ({
  baseURL,
  context,
  page,
}) => {
  if (baseURL === undefined) throw new Error("No base URL");
  const outside: string[] = [];
  page.on("request", (request) => {
    if (!request.url().startsWith(new URL(baseURL).origin))
      outside.push(request.url());
  });
  // The person's session cookie goes to every address on the platform; it must not go on to the provider.
  await context.addCookies([
    { name: "frostbite_session", url: baseURL, value: "SECRET-SESSION" },
  ]);
  await page.goto("/games?code=SECRET-CODE");
  await throwOnPage(page, "e2e uncaught for a@b.co");
  await expect
    .poll(() => exceptions(reports()).length, { timeout: 20_000 })
    .toBeGreaterThan(0);

  const sent = JSON.stringify(exceptions(reports()));
  expect(sent).toContain("e2e uncaught for [removed]");
  expect(sent).not.toContain("a@b.co");
  expect(sent).not.toContain("SECRET-CODE");
  const event = exceptions(reports())[0];
  expect(String(event?.properties.$current_url)).toMatch(/\/games$/u);
  expect(event?.properties.route).toBe("/games");

  // What reached the provider is the report and a few plain headers: nothing that says who the person is or where they were.
  for (const item of reports()) {
    expect(item.headers.cookie).toBeUndefined();
    expect(item.headers.authorization).toBeUndefined();
    expect(item.headers["x-forwarded-for"]).toBeUndefined();
    expect(item.headers.referer).toBeUndefined();
    expect(item.headers.origin).toBeUndefined();
  }
  // The page never talked to anyone but its own server, and kept nothing in the browser.
  expect(outside).toEqual([]);
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
  expect(await page.evaluate(() => document.cookie)).not.toContain("ph_");
});

test("a page that throws nothing sends nothing: no page views, no clicks, no scrolling", async ({
  page,
}) => {
  await page.goto("/games");
  await page.mouse.click(10, 10);
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(6_000);
  expect(stub().received).toEqual([]);
});

test("a promise nobody handles is reported too", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    void Promise.reject(new Error("e2e rejection"));
  });
  await expect
    .poll(() => JSON.stringify(exceptions(reports())), { timeout: 20_000 })
    .toContain("e2e rejection");
});
