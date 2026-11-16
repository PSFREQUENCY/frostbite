import { createHash } from "node:crypto";

import {
  svgContentType,
  type AssetRejectionReason,
  type RasterContentType,
  type SvgPolicy,
  type UploadContentType,
} from "@frostbite/shared/uploads";

import type { FormatParseResult, ImageLimits } from "./contracts.ts";
import { parseJpeg } from "./jpeg.ts";
import { parsePng } from "./png.ts";
import { detectMediaType } from "./signature.ts";
import { prepareSvg } from "./svg.ts";
import { parseWebp } from "./webp.ts";

export { mediaValidatorVersion, type ImageLimits } from "./contracts.ts";

export type ImageValidation =
  | {
      readonly byteLength: number;
      readonly height: number;
      readonly mediaType: UploadContentType;
      readonly ok: true;
      readonly sha256: string;
      readonly width: number;
    }
  | { readonly ok: false; readonly reason: AssetRejectionReason };

function parseByType(
  mediaType: RasterContentType,
  bytes: Uint8Array,
): FormatParseResult {
  switch (mediaType) {
    case "image/png":
      return parsePng(bytes);
    case "image/jpeg":
      return parseJpeg(bytes);
    case "image/webp":
      return parseWebp(bytes);
  }
}

// Pure, bounded-memory validation of fully buffered bytes. The detected format must match the
// declared type, the structure must be complete, and geometry must stay inside the policy limits.
export function validateImage(input: {
  readonly bytes: Uint8Array;
  readonly declaredMediaType: UploadContentType;
  readonly limits: ImageLimits;
  readonly svg: SvgPolicy;
}): ImageValidation {
  const detected = detectMediaType(input.bytes);
  if (input.declaredMediaType === svgContentType) {
    // A picture that is plainly one of the pixel formats is not the vector picture it was declared to be.
    if (detected !== null) return { ok: false, reason: "media-type-mismatch" };
    const prepared = prepareSvg(input.bytes, input.svg);
    if (!prepared.ok) return prepared;
    // The size recorded is the one it will be drawn at; the hash is of what was sent, so a change after this is noticed.
    return {
      byteLength: input.bytes.length,
      height: prepared.height,
      mediaType: svgContentType,
      ok: true,
      sha256: createHash("sha256").update(input.bytes).digest("hex"),
      width: prepared.width,
    };
  }
  if (detected === null) return { ok: false, reason: "unsupported-format" };
  if (detected !== input.declaredMediaType)
    return { ok: false, reason: "media-type-mismatch" };
  const parsed = parseByType(detected, input.bytes);
  if (!parsed.ok) return parsed;
  const { maxDimension, maxPixels } = input.limits;
  if (parsed.width > maxDimension || parsed.height > maxDimension)
    return { ok: false, reason: "dimensions-exceeded" };
  if (parsed.width * parsed.height > maxPixels)
    return { ok: false, reason: "pixels-exceeded" };
  return {
    byteLength: input.bytes.length,
    height: parsed.height,
    mediaType: detected,
    ok: true,
    sha256: createHash("sha256").update(input.bytes).digest("hex"),
    width: parsed.width,
  };
}
