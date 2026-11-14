import { sanitizeDrawing } from "@frostbite/milestone-art";
import type {
  AssetRejectionReason,
  SvgPolicy,
} from "@frostbite/shared/uploads";

import { readAttributes, tidySvg } from "./svg-tidy.ts";

// A vector picture is a program, not pixels, so it is never kept or shown as sent. It is tidied, judged by the strict reader of
// `@frostbite/milestone-art` (an allow-list of shapes, gradients and groups; no script, text, image, link, style or filter), written
// out again in one canonical form at a fixed size, and only that text is drawn. What was uploaded is not shown to anyone.
export type PreparedSvg =
  | {
      readonly height: number;
      readonly ok: true;
      readonly svg: Uint8Array;
      readonly width: number;
    }
  | { readonly ok: false; readonly reason: AssetRejectionReason };

const unsupported = {
  ok: false,
  reason: "svg-unsupported",
} as const satisfies PreparedSvg;

const plainNumber = /^\d+(?:\.\d+)?$/u;
const rootTag = /^<svg([^>]*)>/u;

function positive(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

// The picture's own size: its width and height when both are plain numbers, otherwise the box it is drawn in.
function ownSize(
  attributes: ReadonlyMap<string, string>,
): { height: number; width: number } | null {
  const width = attributes.get("width") ?? "";
  const height = attributes.get("height") ?? "";
  if (plainNumber.test(width) && plainNumber.test(height)) {
    const size = { height: Number(height), width: Number(width) };
    if (positive(size.width) && positive(size.height)) return size;
  }
  const box = (attributes.get("viewBox") ?? "").split(/[ ,]+/u).map(Number);
  const [, , boxWidth = 0, boxHeight = 0] = box;
  return positive(boxWidth) && positive(boxHeight)
    ? { height: boxHeight, width: boxWidth }
    : null;
}

// Whole pixels with the longest side at `side`, however small or large the picture says it is.
function scaled(
  size: { height: number; width: number },
  side: number,
): { height: number; width: number } {
  const factor = side / Math.max(size.width, size.height);
  return {
    height: Math.max(1, Math.round(size.height * factor)),
    width: Math.max(1, Math.round(size.width * factor)),
  };
}

export function prepareSvg(bytes: Uint8Array, policy: SvgPolicy): PreparedSvg {
  if (bytes.length > policy.maxBytes)
    return { ok: false, reason: "size-exceeded" };
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return unsupported;
  }
  const tidied = tidySvg(text);
  if (tidied === null) return unsupported;
  const clean = sanitizeDrawing(tidied, {
    maxAttributeLength: policy.maxAttributeLength,
    maxBytes: policy.maxBytes,
    maxDepth: policy.maxDepth,
    maxElements: policy.maxElements,
  });
  if (!clean.ok) return unsupported;
  // The reader's output is canonical: one root tag whose values are numbers, colours, names and references, never a ">".
  const root = rootTag.exec(clean.svg);
  const size = ownSize(new Map(readAttributes(root?.[1] ?? "")));
  if (root === null || size === null) return unsupported;
  const { height, width } = scaled(size, policy.rasterSide);
  const rest = (root[1] ?? "").replace(/\s(?:width|height)="[^"]*"/gu, "");
  const svg = clean.svg.replace(
    rootTag,
    () => `<svg${rest} width="${String(width)}" height="${String(height)}">`,
  );
  return { height, ok: true, svg: new TextEncoder().encode(svg), width };
}
