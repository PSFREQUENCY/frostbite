import { describe, expect, it } from "vitest";

import {
  assetRejectionReasons,
  defaultUploadPolicy,
  rasterContentTypes,
  resolveUploadPolicy,
  uploadContentTypes,
  uploadContentTypesFor,
} from "../src/uploads/index.ts";

describe("what may be sent for each use", () => {
  it("adds the vector kind to the pixel formats, for the collection uses only", () => {
    expect(uploadContentTypes).toEqual([
      ...rasterContentTypes,
      "image/svg+xml",
    ]);
    for (const purpose of [
      "collection-artwork",
      "collection-banner",
      "collection-item-artwork",
    ] as const)
      expect(uploadContentTypesFor(purpose)).toContain("image/svg+xml");
    expect(uploadContentTypesFor("creator-avatar")).toEqual(rasterContentTypes);
  });

  it("follows the policy it is asked about", () => {
    expect(
      uploadContentTypesFor("creator-avatar", { purposes: ["creator-avatar"] }),
    ).toContain("image/svg+xml");
    expect(
      uploadContentTypesFor("collection-banner", { purposes: [] }),
    ).toEqual(rasterContentTypes);
  });

  it("has a reason to give when a vector picture is not acceptable", () => {
    expect(assetRejectionReasons).toContain("svg-unsupported");
  });
});

describe("the vector picture policy", () => {
  it("has bounded defaults, read by a strict reader", () => {
    expect(defaultUploadPolicy.svg).toMatchObject({
      maxBytes: 2_000_000,
      rasterSide: 1_024,
    });
    expect(resolveUploadPolicy().svg).toEqual(defaultUploadPolicy.svg);
  });

  it("takes part of an override and keeps the rest", () => {
    expect(resolveUploadPolicy({ svg: { rasterSide: 512 } }).svg).toEqual({
      ...defaultUploadPolicy.svg,
      rasterSide: 512,
    });
  });

  it("cannot be drawn larger than the largest image allowed", () => {
    expect(() =>
      resolveUploadPolicy({
        svg: { rasterSide: defaultUploadPolicy.maxImageDimension + 1 },
      }),
    ).toThrow();
  });

  it.each([
    { maxBytes: 0 },
    { maxDepth: 0 },
    { maxDepth: 1_000 },
    { maxElements: -1 },
    { rasterSide: 0 },
  ])("refuses a setting that is out of range: %j", (override) => {
    expect(() => resolveUploadPolicy({ svg: override })).toThrow();
  });
});
