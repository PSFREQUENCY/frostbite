import { describe, expect, it } from "vitest";

import {
  decode,
  figma,
  inkscape,
  prepare,
  svgPolicy,
  withBody,
} from "./support/svg-samples.ts";

function ready(text: string) {
  const result = prepare(text);
  if (!result.ok) throw new Error(`Expected a picture, got ${result.reason}.`);
  return { ...result, text: decode(result.svg) };
}

describe("a picture as a design tool exports it", () => {
  it("is written out again in one form, drawn at the policy size", () => {
    const picture = ready(figma);
    expect(picture.width).toBe(svgPolicy.rasterSide);
    expect(picture.height).toBe(768);
    expect(picture.text).toBe(
      '<svg viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="1024" height="768"><rect width="64" height="48" fill="#1E90FF"/><circle cx="32" cy="24" r="10" fill="#ffffff"/></svg>',
    );
  });

  it("is read again to the same text, so cleaning is steady", () => {
    const once = ready(figma);
    expect(ready(once.text).text).toBe(once.text);
  });
});

describe("a file that begins with a byte order mark", () => {
  it("is read as the picture it is", () => {
    expect(ready(`${String.fromCodePoint(0xfeff)}${figma}`).text).toBe(
      ready(figma).text,
    );
  });
});

describe("a picture as an editor with its own state exports it", () => {
  const picture = ready(inkscape);

  it("keeps the shapes and what the style attribute said", () => {
    expect(picture.text).toContain(
      '<rect id="rect1" x="10" y="10" width="30" height="20" fill="#ff0000" stroke="#000000" stroke-width="2"/>',
    );
  });

  it("takes away the header, the comment, the title, the metadata, the editor's markup and its names", () => {
    for (const gone of [
      "<?xml",
      "Inkscape",
      "title",
      "metadata",
      "rdf",
      "sodipodi",
      "inkscape",
      "version",
      "xmlns:",
    ])
      expect(picture.text).not.toContain(gone);
  });

  it("reads pixel units, and draws a wide picture at the policy size across", () => {
    expect([picture.width, picture.height]).toEqual([1024, 512]);
  });
});

describe("its size", () => {
  it.each([
    ["a tall picture", 'width="50" height="100"', 512, 1024],
    ["a tiny one, drawn up to size", 'width="1" height="1"', 1024, 1024],
    [
      "a huge one, drawn down to size",
      'width="40000" height="20000"',
      1024,
      512,
    ],
    ["one with only a box", "", 1024, 1024],
    [
      "one whose width is a percentage, so the box is used",
      'width="100%" height="100%"',
      1024,
      1024,
    ],
    [
      "one with an extreme shape, never less than one pixel",
      'width="100000" height="1"',
      1024,
      1,
    ],
  ])("%s", (_name, attributes, width, height) => {
    const picture = ready(withBody("", ` ${attributes}`));
    expect([picture.width, picture.height]).toEqual([width, height]);
    expect(picture.text).toContain(
      `width="${String(width)}" height="${String(height)}">`,
    );
  });

  it("follows a different policy size", () => {
    const result = prepare(figma, { ...svgPolicy, rasterSide: 256 });
    expect(result).toMatchObject({ ok: true, width: 256, height: 192 });
  });

  it("refuses a picture with no usable size", () => {
    expect(prepare(withBody("").replace("0 0 10 10", "0 0 0 0"))).toMatchObject(
      { ok: false },
    );
  });
});

describe("a name for a colour", () => {
  it.each(["white", "WHITE", "White"])("%s becomes its hex colour", (name) => {
    expect(
      ready(withBody(`<rect width="1" height="1" fill="${name}"/>`)).text,
    ).toContain('fill="#ffffff"');
  });

  it("is not looked up by the names an object has", () => {
    expect(
      prepare(withBody('<rect width="1" height="1" fill="constructor"/>')),
    ).toEqual({ ok: false, reason: "svg-unsupported" });
  });

  it("is refused where it is not one of the basic names", () => {
    expect(
      prepare(withBody('<rect width="1" height="1" fill="rebeccapurple"/>')).ok,
    ).toBe(false);
  });
});

describe("how large it may be", () => {
  it("refuses a file over the byte limit before reading it", () => {
    const big = withBody(
      `<path d="M0 0 ${"L1 1 ".repeat(svgPolicy.maxBytes)}"/>`,
    );
    expect(prepare(big)).toEqual({ ok: false, reason: "size-exceeded" });
  });

  it("refuses too many elements and too deep a nesting", () => {
    const wide = withBody("<g/>".repeat(11));
    expect(prepare(wide, { ...svgPolicy, maxElements: 10 }).ok).toBe(false);
    expect(
      prepare(withBody("<g><g><g><g/></g></g></g>"), {
        ...svgPolicy,
        maxDepth: 3,
      }).ok,
    ).toBe(false);
    expect(prepare(wide).ok).toBe(true);
  });
});
