import { createDecodablePng } from "@frostbite/test-kit/png";
import { expect, test } from "@playwright/test";

import { creatorE2EFixtures } from "../src/creator-fixtures.ts";
import { signIn } from "../src/upload-helpers.ts";
import { detailOf, readDraft } from "./support/collection-helpers.ts";

// Images are uploaded where they are used: a creator adds a cover and a banner from inside the wizard's
// images step, on real storage and a real worker, and never leaves the page. Desktop only.
test.describe.configure({ mode: "serial", timeout: 180_000 });

const png = (name: string) => ({
  buffer: createDecodablePng(16, 16),
  mimeType: "image/png",
  name,
});

test("a creator uploads a cover and a banner inside the wizard and never leaves it", async ({
  baseURL,
  page,
}) => {
  await signIn(page, baseURL, creatorE2EFixtures.collectionInlineCreator);
  await page.goto("/studio/collections");
  await page.getByRole("link", { name: "Start your first collection" }).click();
  await page.getByLabel("Collection name").fill("Uploaded in place");
  await page.getByLabel("Planned supply").fill("1");
  await page.getByRole("button", { name: "Create collection" }).click();
  await expect(page).toHaveURL(/\/studio\/collections\/[0-9a-f-]{36}$/u);
  const wizardPath = new URL(page.url()).pathname;

  await page.getByRole("button", { name: "3. Images" }).click();
  const cover = page.getByRole("group", { name: "Cover image" });
  const banner = page.getByRole("group", { name: "Banner image" });
  // A new creator has no images, and the way to add one is right here.
  await expect(cover.getByText("You have no ready images")).toBeVisible();
  await expect(banner.getByText("You have no ready images")).toBeVisible();

  await cover.locator('input[type="file"]').setInputFiles(png("cover.png"));
  // "None" is chosen from the start, so the image is awaited by what it brings: the library now holds it.
  await expect(cover.getByText("You have no ready images")).toHaveCount(0, {
    timeout: 90_000,
  });
  // The cover is chosen without clicking it, and the banner is untouched.
  await expect(
    cover.getByRole("radio", { name: "Choose this image", checked: true }),
  ).toHaveCount(1);
  await expect(banner.getByText("You have no ready images")).toBeVisible();

  await banner
    .locator('input[type="file"]')
    .first()
    .setInputFiles(png("banner.png"));
  await expect(banner.getByText("You have no ready images")).toHaveCount(0, {
    timeout: 90_000,
  });
  await expect(
    banner.getByRole("radio", { name: "Choose this image", checked: true }),
  ).toHaveCount(1);
  // Still on the same page (only the step's fragment changed).
  expect(new URL(page.url()).pathname).toBe(wizardPath);

  // What was chosen is saved with the draft, like any other choice.
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Saved.")).toBeVisible();
  const id = wizardPath.split("/").pop();
  if (id === undefined)
    throw new Error("Expected the collection id in the address");
  const saved = await detailOf(await readDraft(page.request, id));
  expect(saved.collection.coverAssetId).not.toBeNull();
  expect(saved.collection.bannerAssetId).not.toBeNull();
  expect(saved.collection.coverAssetId).not.toBe(
    saved.collection.bannerAssetId,
  );

  // The collections list shows the cover that was chosen, picture and all, instead of a monogram.
  await page.goto("/studio/collections");
  const picture = page.getByRole("img", { name: "Uploaded in place cover" });
  await expect(picture).toBeVisible();
  await expect
    .poll(() =>
      picture.evaluate((image: HTMLImageElement) => image.naturalWidth),
    )
    .toBeGreaterThan(0);
});

const svg = (name: string, body: string) => ({
  buffer: Buffer.from(
    `<?xml version="1.0"?>\n<!-- exported -->\n<svg xmlns="http://www.w3.org/2000/svg" width="64px" height="48px" viewBox="0 0 64 48"><title>${name}</title>${body}</svg>`,
  ),
  mimeType: "image/svg+xml",
  name,
});

// A vector picture is cleaned and drawn on the server, so what is shown is a picture made from it; one that does more than draw is refused
// with words that say what to change, and nothing of it is kept as an image.
test("a creator uploads a vector cover, which is drawn, and one that carries a script, which is refused", async ({
  baseURL,
  page,
}) => {
  await signIn(page, baseURL, creatorE2EFixtures.collectionVectorCreator);
  await page.goto("/studio/collections");
  await page.getByRole("link", { name: "Start your first collection" }).click();
  await page.getByLabel("Collection name").fill("Drawn from a vector");
  await page.getByLabel("Planned supply").fill("1");
  await page.getByRole("button", { name: "Create collection" }).click();
  await expect(page).toHaveURL(/\/studio\/collections\/[0-9a-f-]{36}$/u);
  await page.getByRole("button", { name: "3. Images" }).click();
  const cover = page.getByRole("group", { name: "Cover image" });
  await expect(cover.locator('input[type="file"]')).toHaveAttribute(
    "accept",
    /image\/svg\+xml/u,
  );

  await cover
    .locator('input[type="file"]')
    .setInputFiles(
      svg(
        "script.svg",
        '<rect width="64" height="48" fill="#ff0000"/><script>alert(1)</script>',
      ),
    );
  await expect(
    cover.getByText(/This SVG uses something that cannot be accepted/u),
  ).toBeVisible({ timeout: 90_000 });
  await expect(cover.getByText("You have no ready images")).toBeVisible();

  await cover
    .locator('input[type="file"]')
    .setInputFiles(
      svg(
        "cover.svg",
        '<rect style="fill:#1E90FF" width="64" height="48"/><circle cx="32" cy="24" r="10" fill="white"/>',
      ),
    );
  await expect(cover.getByText("You have no ready images")).toHaveCount(0, {
    timeout: 90_000,
  });
  await expect(
    cover.getByRole("radio", { name: "Choose this image", checked: true }),
  ).toHaveCount(1);
});
