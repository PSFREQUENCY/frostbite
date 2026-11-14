import { createHash } from "node:crypto";

import { defaultUploadPolicy } from "@frostbite/shared/uploads";
import { describe, expect, it } from "vitest";

import { validateImage } from "../src/validate.ts";
import { fixture } from "./support/files.ts";
import { encode, figma, svgPolicy, withBody } from "./support/svg-samples.ts";

const limits = {
  maxDimension: defaultUploadPolicy.maxImageDimension,
  maxPixels: defaultUploadPolicy.maxImagePixels,
};
const declaredSvg = (bytes: Uint8Array) =>
  validateImage({
    bytes,
    declaredMediaType: "image/svg+xml",
    limits,
    svg: svgPolicy,
  });

describe("a vector picture that was declared as one", () => {
  it("is valid, recorded at the size it will be drawn and with the hash of what was sent", () => {
    const bytes = encode(figma);
    expect(declaredSvg(bytes)).toEqual({
      byteLength: bytes.length,
      height: 768,
      mediaType: "image/svg+xml",
      ok: true,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      width: 1024,
    });
  });

  it("is refused with the reason, when it is not acceptable", () => {
    expect(declaredSvg(encode(withBody("<script/>")))).toEqual({
      ok: false,
      reason: "svg-unsupported",
    });
  });

  it("is refused when it is larger than a vector picture may be", () => {
    const bytes = encode(
      withBody(`<path d="M0 0 ${"L1 1 ".repeat(svgPolicy.maxBytes)}"/>`),
    );
    expect(declaredSvg(bytes)).toEqual({ ok: false, reason: "size-exceeded" });
  });

  it("is not a picture that is plainly a pixel format", () => {
    expect(declaredSvg(fixture("real-rgb.png"))).toEqual({
      ok: false,
      reason: "media-type-mismatch",
    });
  });
});

describe("a vector picture that was declared as a pixel format", () => {
  it.each(["image/png", "image/jpeg", "image/webp"] as const)(
    "is not accepted as %s",
    (declaredMediaType) => {
      const result = validateImage({
        bytes: encode(figma),
        declaredMediaType,
        limits,
        svg: svgPolicy,
      });
      expect(result).toEqual({ ok: false, reason: "unsupported-format" });
    },
  );
});
