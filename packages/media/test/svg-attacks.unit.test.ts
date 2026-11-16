import { describe, expect, it } from "vitest";

import {
  encode,
  figma,
  prepare,
  svgPolicy,
  withBody,
} from "./support/svg-samples.ts";
import { prepareSvg } from "../src/svg.ts";

const refused = { ok: false, reason: "svg-unsupported" } as const;
const evil = "https://evil.example/x";

// Every one of these is something a picture has been used for besides being a picture. A file with any of them is refused whole: not
// cleaned, not passed on, and nothing of it is drawn.
describe("a picture that does more than draw", () => {
  it.each([
    ["a script", withBody("<script>alert(1)</script>")],
    [
      "a script with a namespace prefix",
      withBody(
        '<s:script xmlns:s="http://www.w3.org/2000/svg">alert(1)</s:script>',
      ),
    ],
    ["a script in another case", withBody("<SCRIPT>alert(1)</SCRIPT>")],
    ["an event handler on the picture", withBody("", ' onload="alert(1)"')],
    [
      "an event handler on a shape",
      withBody('<rect width="1" height="1" onclick="alert(1)"/>'),
    ],
    [
      "html inside the picture",
      withBody(
        '<foreignObject width="9" height="9"><div>hi</div></foreignObject>',
      ),
    ],
    [
      "an image from elsewhere",
      withBody(`<image href="${evil}.png" width="9" height="9"/>`),
    ],
    [
      "an image from a file on the machine",
      withBody('<image href="file:///etc/passwd" width="9" height="9"/>'),
    ],
    [
      "an image inside the file",
      withBody(
        '<image href="data:image/png;base64,AAAA" width="9" height="9"/>',
      ),
    ],
    [
      "another picture used by reference",
      withBody(
        '<use xlink:href="#a" xmlns:xlink="http://www.w3.org/1999/xlink"/>',
      ),
    ],
    [
      "a link",
      withBody(
        '<a href="javascript:alert(1)"><rect width="1" height="1"/></a>',
      ),
    ],
    [
      "a stylesheet that imports another",
      withBody(`<style>@import url(${evil}.css);</style>`),
    ],
    ["a style element", withBody("<style>rect{fill:red}</style>")],
    [
      "an animation that sets a link",
      withBody(
        '<rect width="1" height="1"><animate attributeName="href" to="javascript:alert(1)"/></rect>',
      ),
    ],
    [
      "a set that changes an attribute",
      withBody(
        '<rect width="1" height="1"><set attributeName="onload" to="alert(1)"/></rect>',
      ),
    ],
    ["text", withBody('<text x="1" y="1">hello</text>')],
    [
      "a filter",
      withBody('<filter id="f"><feImage href="file:///etc/passwd"/></filter>'),
    ],
    [
      "a paint from elsewhere",
      withBody(`<rect width="1" height="1" fill="url(${evil})"/>`),
    ],
    [
      "a paint from elsewhere in a style attribute",
      withBody(`<rect width="1" height="1" style="fill:url(${evil})"/>`),
    ],
    [
      "a reference to nothing",
      withBody('<rect width="1" height="1" fill="url(#missing)"/>'),
    ],
    [
      "a style the reader does not know",
      withBody('<rect width="1" height="1" style="behavior:url(x.htc)"/>'),
    ],
    [
      "a style that is not a declaration",
      withBody('<rect width="1" height="1" style="whatever"/>'),
    ],
    [
      "an entity in a value",
      withBody('<rect width="1" height="1" fill="&#35;fff"/>'),
    ],
    ["a second picture inside the first", withBody('<svg viewBox="0 0 1 1"/>')],
    [
      "text between shapes",
      withBody('<rect width="1" height="1"/>hello<rect width="1" height="1"/>'),
    ],
    ["a file that is not a picture", "<html><body>hello</body></html>"],
    ["an empty file", ""],
    ["something that is not markup", "just words"],
  ])("refuses %s", (_name, text) => {
    expect(prepare(text)).toEqual(refused);
  });

  it.each([
    [
      "a doctype",
      '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">',
    ],
    [
      "an entity that expands without end",
      '<!DOCTYPE svg [<!ENTITY a "aaaaaaaaaa"><!ENTITY b "&a;&a;&a;&a;&a;&a;&a;&a;&a;&a;">]>',
    ],
    [
      "an entity that reads a file",
      '<!DOCTYPE svg [<!ENTITY x SYSTEM "file:///etc/passwd">]>',
    ],
    [
      "an external stylesheet",
      '<?xml-stylesheet href="https://evil.example/x.css"?>',
    ],
  ])("refuses %s ahead of the picture", (_name, head) => {
    expect(prepare(`${head}\n${figma}`)).toEqual(refused);
  });

  it("refuses CDATA, and a comment that never ends", () => {
    expect(prepare(withBody("<![CDATA[x]]>"))).toEqual(refused);
    expect(prepare(`${figma}<!-- never closed`)).toEqual(refused);
  });

  it("refuses bytes that are not text", () => {
    expect(
      prepareSvg(Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0xff, 0xfe), svgPolicy),
    ).toEqual(refused);
    expect(prepareSvg(Uint8Array.of(0xc3, 0x28), svgPolicy)).toEqual(refused);
  });
});

// Things that look like trouble to a person but are only the file's own bookkeeping, and are dropped, so what is drawn is never changed.
describe("what is dropped and not refused", () => {
  const drawn = (text: string) => {
    const result = prepare(text);
    if (!result.ok) throw new Error(result.reason);
    return new TextDecoder().decode(result.svg);
  };

  it.each([
    [
      "a link on a shape that has a namespace",
      withBody(
        '<rect width="1" height="1" xlink:href="javascript:alert(1)" xmlns:xlink="http://www.w3.org/1999/xlink"/>',
      ),
    ],
    [
      "a comment that holds a script",
      withBody(
        "<!-- <script>alert(1)</script> --><rect width='1' height='1'/>",
      ),
    ],
    [
      "a title that holds a script",
      withBody(
        "<title><script>alert(1)</script></title><rect width='1' height='1'/>",
      ),
    ],
    [
      "a class and a data attribute",
      withBody('<rect width="1" height="1" class="a" data-x="<b>"/>'),
    ],
  ])("%s", (_name, text) => {
    const result = drawn(text);
    expect(result).not.toMatch(/script|href|alert|class|data-|<!--|title/u);
    expect(result).toContain("<rect");
  });

  it("never writes anything that was not on the allow-list", () => {
    const result = drawn(figma);
    expect(result).toMatch(
      /^<svg [^>]*>(?:<(?:rect|circle)[^>]*\/>)+<\/svg>$/u,
    );
  });

  it("holds its own against input made up to be awkward", () => {
    for (const odd of [
      "<",
      "<svg",
      "<svg>",
      "<svg/>",
      "<<svg>>",
      '<svg a="',
      "<svg a='>",
      `<svg ${'a="b" '.repeat(5000)}>`,
      "\u0000",
      "<svg>\u0000</svg>",
    ])
      expect(prepare(odd).ok).toBe(false);
    expect(prepare(encode("x").length > 0 ? `${figma}\n\n\n` : figma).ok).toBe(
      true,
    );
  });
});
