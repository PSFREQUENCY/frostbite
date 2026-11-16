import { describe, expect, it } from "vitest";

import { setup, sha } from "./support/processing-setup.ts";

const exported = `<?xml version="1.0"?>
<!-- made by an editor -->
<svg width="64" height="48" viewBox="0 0 64 48" xmlns="http://www.w3.org/2000/svg">
<title>cover</title>
<rect width="64" height="48" fill="#1E90FF"/>
</svg>`;
const dangerous = exported.replace("</svg>", "<script>alert(1)</script></svg>");

function svgSetup(
  text: string,
  subject: { height?: number; width?: number } = {},
) {
  const bytes = new TextEncoder().encode(text);
  return setup({
    source: bytes,
    subject: {
      byteLength: bytes.length,
      contentSha256: sha(bytes),
      contentType: "image/svg+xml",
      height: 768,
      width: 1024,
      ...subject,
    },
  });
}

describe("processing a vector picture", () => {
  it("gives the decoder the cleaned picture at its recorded size, never the file that was sent", async () => {
    const { processor, service, subject } = svgSetup(exported);
    await expect(
      service.process({ assetId: subject.assetId }),
    ).resolves.toMatchObject({
      kind: "recorded",
      outcome: { state: "processed" },
    });
    const [request] = processor.inputs;
    expect(request?.expected).toEqual({ height: 768, width: 1024 });
    expect(new TextDecoder().decode(request?.bytes)).toBe(
      '<svg viewBox="0 0 64 48" xmlns="http://www.w3.org/2000/svg" width="1024" height="768"><rect width="64" height="48" fill="#1E90FF"/></svg>',
    );
  });

  it("is made unprocessable, and never decoded, when it is not acceptable", async () => {
    const { processor, service, subject } = svgSetup(dangerous);
    await expect(
      service.process({ assetId: subject.assetId }),
    ).resolves.toMatchObject({
      outcome: { reason: "svg-unsupported", state: "unprocessable" },
    });
    expect(processor.inputs).toEqual([]);
  });

  it("is made unprocessable when it would not be drawn at the size recorded for it", async () => {
    const { processor, service, subject } = svgSetup(exported, { width: 512 });
    await expect(
      service.process({ assetId: subject.assetId }),
    ).resolves.toMatchObject({
      outcome: { reason: "decoded-size-mismatch", state: "unprocessable" },
    });
    expect(processor.inputs).toEqual([]);
  });

  it("is made unprocessable when what was stored is not what was checked", async () => {
    const checked = new TextEncoder().encode(exported);
    const stored = new TextEncoder().encode(dangerous);
    const { processor, service, subject } = setup({
      source: stored,
      subject: {
        byteLength: stored.length,
        contentSha256: sha(checked),
        contentType: "image/svg+xml",
        height: 768,
        width: 1024,
      },
    });
    await expect(
      service.process({ assetId: subject.assetId }),
    ).resolves.toMatchObject({
      outcome: { reason: "content-changed", state: "unprocessable" },
    });
    expect(processor.inputs).toEqual([]);
  });
});
