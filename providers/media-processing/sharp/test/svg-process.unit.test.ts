import { prepareSvg } from "@frostbite/media/svg";
import { defaultUploadPolicy } from "@frostbite/shared/uploads";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { run } from "./support/run-processor.ts";

const policy = defaultUploadPolicy.svg;
const picture = `<svg width="64" height="48" viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="64" height="48" fill="#1E90FF"/>
<circle cx="32" cy="24" r="10" fill="white"/>
</svg>`;

// What the platform does with a vector picture: cleaned by `prepareSvg`, then drawn by the same decoder as every other picture, so the
// pixels are a drawing of the cleaned text and nothing else.
async function drawn(text: string) {
  const prepared = prepareSvg(new TextEncoder().encode(text), policy);
  if (!prepared.ok) throw new Error(prepared.reason);
  const result = await run(prepared.svg, prepared.width, prepared.height);
  if (!result.ok) throw new Error(result.reason);
  return { prepared, result };
}

async function pixel(bytes: Uint8Array, x: number, y: number) {
  const { data, info } = await sharp(bytes)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const at = (y * info.width + x) * info.channels;
  return [data[at], data[at + 1], data[at + 2]];
}

describe("a vector picture, cleaned and drawn", () => {
  it("makes a thumbnail and a preview in the usual format and sizes", async () => {
    const { result } = await drawn(picture);
    expect(
      result.derivatives.map(({ kind, width, height }) => [
        kind,
        width,
        height,
      ]),
    ).toEqual([
      ["thumbnail", 256, 192],
      ["preview", 1_024, 768],
    ]);
    for (const { bytes } of result.derivatives)
      expect((await sharp(bytes).metadata()).format).toBe("webp");
  });

  it("draws what the picture says: its colours, in the right places", async () => {
    const { result } = await drawn(picture);
    const preview = result.derivatives[1]?.bytes ?? new Uint8Array();
    const near = (found: (number | undefined)[], wanted: number[]) =>
      found.every(
        (value, index) => Math.abs((value ?? 0) - (wanted[index] ?? 0)) <= 6,
      );
    expect(near(await pixel(preview, 4, 4), [0x1e, 0x90, 0xff])).toBe(true);
    expect(near(await pixel(preview, 512, 384), [255, 255, 255])).toBe(true);
  });

  it("is drawn at the size that was recorded for it", async () => {
    const prepared = prepareSvg(new TextEncoder().encode(picture), policy);
    if (!prepared.ok) throw new Error(prepared.reason);
    const wrong = await run(prepared.svg, prepared.width, prepared.height + 1);
    expect(wrong).toEqual({ ok: false, reason: "decoded-size-mismatch" });
  });

  it("is not drawn from the picture as it was sent: an image it points to is never fetched", async () => {
    const hostile = picture.replace(
      "</svg>",
      '<image href="file:///etc/hostname" width="64" height="48"/></svg>',
    );
    expect(prepareSvg(new TextEncoder().encode(hostile), policy)).toEqual({
      ok: false,
      reason: "svg-unsupported",
    });
  });
});
